import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MockDatasetDocument = HydratedDocument<MockDataset>;

@Schema({ timestamps: true, collection: 'mock_datasets' })
export class MockDataset {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  protocol!: string;

  @Prop({ type: Object })
  defaultData?: unknown;

  @Prop({ type: Array, default: [] })
  variants!: Array<{ params: Record<string, string | number>; data: unknown }>;
}

export const MockDatasetSchema = SchemaFactory.createForClass(MockDataset);
