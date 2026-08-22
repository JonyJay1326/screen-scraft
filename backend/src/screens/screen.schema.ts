import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Category, FitMode, PageDoc } from '@screencraft/shared';
import { HydratedDocument } from 'mongoose';

export type ScreenDocument = HydratedDocument<Screen>;

/** 大屏文档（整屏覆盖保存） */
@Schema({ timestamps: true, collection: 'screens' })
export class Screen {
  @Prop({ required: true, index: true })
  projectId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, default: '通用' })
  category!: Category;

  @Prop({ required: true, default: false })
  deployed!: boolean;

  @Prop({ required: true, default: 'center' })
  fitMode!: FitMode;

  @Prop({ type: Object, required: true, default: () => ({ width: 1920, height: 1080 }) })
  canvas!: { width: number; height: number };

  @Prop({ type: Array, required: true, default: [] })
  pages!: PageDoc[];

  @Prop()
  thumbnail?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ScreenSchema = SchemaFactory.createForClass(Screen);
