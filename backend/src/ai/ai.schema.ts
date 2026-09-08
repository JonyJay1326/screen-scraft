import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KbDocDocument = HydratedDocument<KbDoc>;

/** 知识库文档 */
@Schema({ timestamps: true, collection: 'kb_docs' })
export class KbDoc {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: String, default: 'md' })
  format!: 'md' | 'txt';

  @Prop({ type: Array, default: [] })
  chunks!: { text: string; embedding?: number[] }[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const KbDocSchema = SchemaFactory.createForClass(KbDoc);

export type AiSettingsDocument = HydratedDocument<AiSettings>;

/** 大模型配置（单例） */
@Schema({ timestamps: true, collection: 'ai_settings' })
export class AiSettings {
  @Prop({ type: String, default: 'deepseek' })
  provider!: 'deepseek';

  @Prop({ type: String, default: 'https://api.deepseek.com' })
  baseUrl!: string;

  @Prop({ type: String, default: '' })
  apiKeyEnc!: string;

  @Prop({ type: String, default: 'deepseek-v4-flash' })
  textModel!: string;

  @Prop({ type: String, default: 'deepseek-v4-flash-vision-exp' })
  visionModel!: string;

  @Prop({ type: Boolean, default: true })
  visionEnabled!: boolean;

  /** v0.3 兼容字段：保留旧数据，不再由新功能读写。 */
  @Prop({ type: String, default: '' })
  chatModel!: string;

  @Prop({ type: String, default: '' })
  embeddingModel!: string;
}

export const AiSettingsSchema = SchemaFactory.createForClass(AiSettings);
