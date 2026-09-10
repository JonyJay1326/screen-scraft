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

export type AiReferenceAssetRecordDocument = HydratedDocument<AiReferenceAssetRecord>;

/** AI 参考图临时元数据；文件存放在非公开目录，由应用层 TTL 清理。 */
@Schema({ timestamps: true, collection: 'ai_reference_assets' })
export class AiReferenceAssetRecord {
  @Prop({ type: String, required: true, index: true })
  ownerId!: string;

  @Prop({ type: String, required: true })
  storageName!: string;

  @Prop({ type: String, required: true, enum: ['image/png', 'image/jpeg', 'image/webp'] })
  mimeType!: 'image/png' | 'image/jpeg' | 'image/webp';

  @Prop({ type: Number, required: true })
  size!: number;

  @Prop({ type: Number, required: true })
  width!: number;

  @Prop({ type: Number, required: true })
  height!: number;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;
}

export const AiReferenceAssetRecordSchema = SchemaFactory.createForClass(AiReferenceAssetRecord);

export type AiBorderAssetRecordDocument = HydratedDocument<AiBorderAssetRecord>;

/** 永久九宫格边框图元数据；文件位于公开 uploads/border-assets，业务按 ownerId 鉴权。 */
@Schema({ timestamps: true, collection: 'ai_border_assets' })
export class AiBorderAssetRecord {
  @Prop({ type: String, required: true, index: true })
  ownerId!: string;

  @Prop({ type: String, required: true })
  storageName!: string;

  @Prop({ type: String, required: true, enum: ['image/png', 'image/webp'] })
  mimeType!: 'image/png' | 'image/webp';

  @Prop({ type: Number, required: true })
  size!: number;

  @Prop({ type: Number, required: true })
  width!: number;

  @Prop({ type: Number, required: true })
  height!: number;

  @Prop({ type: String, required: true })
  url!: string;
}

export const AiBorderAssetRecordSchema = SchemaFactory.createForClass(AiBorderAssetRecord);
