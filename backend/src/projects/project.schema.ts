import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

/** 项目 */
@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ required: true })
  name!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
