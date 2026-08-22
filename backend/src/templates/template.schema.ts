import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Category, ScreenDoc } from '@screencraft/shared';
import { HydratedDocument } from 'mongoose';

export type TemplateDocument = HydratedDocument<ScreenTemplate>;

/** 大屏模板快照 */
@Schema({ timestamps: true, collection: 'templates' })
export class ScreenTemplate {
  @Prop({ required: true, enum: ['public', 'personal'] })
  scope!: 'public' | 'personal';

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  category!: Category;

  @Prop({ required: true })
  ownerId!: string;

  @Prop({ type: Object, required: true })
  screenSnapshot!: Omit<ScreenDoc, '_id' | 'projectId' | 'createdAt' | 'updatedAt'>;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(ScreenTemplate);
