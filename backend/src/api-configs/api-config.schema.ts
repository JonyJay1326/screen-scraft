import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApiConfigDocument = HydratedDocument<ApiConfig>;

/** API 配置（密钥只存后端） */
@Schema({ timestamps: true, collection: 'api_configs' })
export class ApiConfig {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['sql', 'external'] })
  type!: 'sql' | 'external';

  @Prop()
  sql?: string;

  @Prop({ type: Object })
  external?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    authType?: 'none' | 'bearer' | 'basic';
  };

  @Prop()
  authSecretEnc?: string;

  @Prop({ type: Array, default: [] })
  params!: { name: string; type: 'string' | 'number'; defaultValue?: unknown }[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const ApiConfigSchema = SchemaFactory.createForClass(ApiConfig);
