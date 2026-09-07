import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { BizException } from '../common/biz.exception';
import { decryptSecret, encryptSecret, maskSecret } from '../common/secret.util';
import { AiSettings, KbDoc } from './ai.schema';
import { AiSettingsDto, ChatDto, UpsertKbDto } from './ai.dto';
import { bm25Search } from './bm25';

const CHUNK = 420;

/** RAG 客服：分块 → embedding 或 BM25 → 生成 */
@Injectable()
export class AiService {
  constructor(
    @InjectModel(KbDoc.name) private readonly kbModel: Model<KbDoc>,
    @InjectModel(AiSettings.name) private readonly settingsModel: Model<AiSettings>,
    private readonly config: ConfigService,
  ) {}

  /** 文档列表 */
  async listDocs() {
    const rows = await this.kbModel.find().sort({ updatedAt: -1 }).exec();
    return rows.map((row) => ({
      _id: String(row._id),
      title: row.title,
      format: row.format,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /** 文档详情 */
  async getDoc(id: string) {
    const row = await this.requireDoc(id);
    return { _id: String(row._id), title: row.title, content: row.content, format: row.format };
  }

  /** 上传/新建文档并索引 */
  async createDoc(dto: UpsertKbDto) {
    const chunks = await this.buildChunks(dto.content);
    const row = await this.kbModel.create({
      title: dto.title.trim(),
      content: dto.content,
      format: dto.format === 'txt' ? 'txt' : 'md',
      chunks,
    });
    return { _id: String(row._id) };
  }

  /** 更新并重索引 */
  async updateDoc(id: string, dto: UpsertKbDto) {
    const row = await this.requireDoc(id);
    row.title = dto.title.trim();
    row.content = dto.content;
    row.format = dto.format === 'txt' ? 'txt' : 'md';
    row.chunks = await this.buildChunks(dto.content);
    await row.save();
    return { ok: true as const };
  }

  /** 删除文档 */
  async removeDoc(id: string) {
    await this.requireDoc(id);
    await this.kbModel.deleteOne({ _id: id }).exec();
    return { ok: true as const };
  }

  /** 读取设置（密钥脱敏） */
  async getSettings() {
    const row = await this.loadSettings();
    const plain = this.decryptKey(row.apiKeyEnc);
    return {
      baseUrl: row.baseUrl,
      chatModel: row.chatModel,
      embeddingModel: row.embeddingModel,
      apiKeyMasked: plain ? maskSecret(plain) : '',
    };
  }

  /** 保存设置 */
  async saveSettings(dto: AiSettingsDto) {
    const row = await this.loadSettings();
    row.baseUrl = dto.baseUrl.trim();
    row.chatModel = dto.chatModel.trim();
    row.embeddingModel = dto.embeddingModel?.trim() ?? '';
    if (dto.apiKey && !dto.apiKey.includes('*')) {
      row.apiKeyEnc = encryptSecret(dto.apiKey, this.config.getOrThrow<string>('JWT_SECRET'));
    }
    await row.save();
    return this.getSettings();
  }

  /** 问答 */
  async chat(dto: ChatDto): Promise<{ answer: string }> {
    const question = dto.question.trim();
    if (!question) {
      throw BizException.validation('请输入问题');
    }
    const docs = await this.kbModel.find().exec();
    const chunks = docs.flatMap((doc) =>
      (doc.chunks ?? []).map((chunk, index) => ({
        id: `${String(doc._id)}-${index}`,
        text: chunk.text,
        embedding: chunk.embedding,
      })),
    );
    const settings = await this.loadSettings();
    const retrieved = bm25Search(question, chunks, 4);
    const context = retrieved.map((item) => item.text).join('\n---\n');
    const answer = await this.generate(question, context, settings);
    return { answer };
  }

  /** 调用 OpenAI 兼容接口；无配置则直接摘录知识库 */
  private async generate(question: string, context: string, settings: AiSettings): Promise<string> {
    const apiKey = this.decryptKey(settings.apiKeyEnc) || this.config.get<string>('LLM_API_KEY') || '';
    const baseUrl = settings.baseUrl || this.config.get<string>('LLM_BASE_URL') || '';
    const model = settings.chatModel || this.config.get<string>('LLM_CHAT_MODEL') || '';
    if (!baseUrl || !apiKey || !model) {
      if (!context) {
        return '知识库暂无匹配内容。常用操作：左侧「组件」面板点击「折线图·样式1」即可添加到画布中央；Ctrl+S 保存大屏；下拉框事件选 change、动作选调 API，绑定参数名与目标 API 占位符同名即可联动。管理员可在「AI 设置」上传操作手册并配置大模型。';
      }
      return `根据手册：\n${context.slice(0, 1200)}`;
    }
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    try {
      const result = await axios.post(
        url,
        {
          model,
          messages: [
            {
              role: 'system',
              content: '你是 ScreenCraft 大屏配置系统的客服。只根据给定手册回答如何配置、如何操作的问题。不要编造接口或功能。',
            },
            { role: 'user', content: `手册摘录：\n${context}\n\n问题：${question}` },
          ],
          temperature: 0.2,
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 },
      );
      const text = result.data?.choices?.[0]?.message?.content;
      return String(text || '暂时无法生成回答');
    } catch {
      return context ? `模型调用失败，先根据手册摘录：\n${context.slice(0, 800)}` : '模型调用失败，请检查 AI 设置。';
    }
  }

  /** 分块，若配置了 embedding 则写入向量 */
  private async buildChunks(content: string) {
    const parts = splitChunks(content);
    const settings = await this.loadSettings();
    const apiKey = this.decryptKey(settings.apiKeyEnc) || this.config.get<string>('LLM_API_KEY') || '';
    const baseUrl = settings.baseUrl || this.config.get<string>('LLM_BASE_URL') || '';
    const model = settings.embeddingModel || this.config.get<string>('LLM_EMBEDDING_MODEL') || '';
    if (!baseUrl || !apiKey || !model) {
      return parts.map((text) => ({ text }));
    }
    const out: { text: string; embedding?: number[] }[] = [];
    for (const text of parts) {
      try {
        const result = await axios.post(
          `${baseUrl.replace(/\/$/, '')}/embeddings`,
          { model, input: text },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 20000 },
        );
        const embedding = result.data?.data?.[0]?.embedding as number[] | undefined;
        out.push({ text, embedding });
      } catch {
        out.push({ text });
      }
    }
    return out;
  }

  /** 读取或创建单例配置 */
  private async loadSettings() {
    const row = await this.settingsModel.findOne().exec();
    if (row) {
      return row;
    }
    return this.settingsModel.create({
      baseUrl: this.config.get<string>('LLM_BASE_URL') || '',
      chatModel: this.config.get<string>('LLM_CHAT_MODEL') || '',
      embeddingModel: this.config.get<string>('LLM_EMBEDDING_MODEL') || '',
      apiKeyEnc: '',
    });
  }

  /** 解密 key */
  private decryptKey(enc?: string): string {
    if (!enc) {
      return '';
    }
    try {
      return decryptSecret(enc, this.config.getOrThrow<string>('JWT_SECRET'));
    } catch {
      return '';
    }
  }

  /** 文档必须存在 */
  private async requireDoc(id: string) {
    const row = await this.kbModel.findById(id).exec();
    if (!row) {
      throw BizException.notFound('文档不存在');
    }
    return row;
  }
}

/** 按段落/长度分块 */
function splitChunks(content: string): string[] {
  const paras = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = '';
  paras.forEach((para) => {
    if ((buf + '\n' + para).length > CHUNK) {
      if (buf) {
        chunks.push(buf);
      }
      buf = para;
    } else {
      buf = buf ? `${buf}\n${para}` : para;
    }
  });
  if (buf) {
    chunks.push(buf);
  }
  return chunks.length ? chunks : [content.slice(0, CHUNK)];
}
