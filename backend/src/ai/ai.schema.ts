import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KbDocDocument = HydratedDocument<KbDoc>;

/** 知识库文档 */
@Schema({ timestamps: true, collection: 'kb_docs' })
export class KbDoc {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ default: 'md' })
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
  @Prop({ default: '' })
  baseUrl!: string;

  @Prop({ default: '' })
  apiKeyEnc!: string;

  @Prop({ default: '' })
  chatModel!: string;

  @Prop({ default: '' })
  embeddingModel!: string;
}

export const AiSettingsSchema = SchemaFactory.createForClass(AiSettings);
