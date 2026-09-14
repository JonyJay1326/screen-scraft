import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ProtocolKind } from '@screencraft/shared';
import { HydratedDocument } from 'mongoose';

export type ApiConfigDocument = HydratedDocument<ApiConfig>;

/** API 配置（密钥只存后端） */
@Schema({ timestamps: true, collection: 'api_configs' })
export class ApiConfig {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['sql', 'external', 'mock'] })
  type!: 'sql' | 'external' | 'mock';

  @Prop({ enum: ['axis', 'combo', 'radar', 'nameValue', 'table', 'options', 'weather', 'kpi-1', 'kpi-2', 'kpi-3', 'kpi-5', 'kpi-8', 'kpi-list'] })
  dataProtocol?: ProtocolKind;

  @Prop()
  sql?: string;

  @Prop()
  mockKey?: string;

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
