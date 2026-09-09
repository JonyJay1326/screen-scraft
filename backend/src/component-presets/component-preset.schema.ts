import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ComponentDefinitionSnapshot } from '@screencraft/shared';
import type { HydratedDocument } from 'mongoose';

export type ComponentPresetDocument = HydratedDocument<ComponentPreset>;

@Schema({ timestamps: true, collection: 'component_presets' })
export class ComponentPreset {
  @Prop({ type: String, required: true, index: true })
  ownerId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, required: true, enum: ['personal', 'public'], index: true })
  scope!: 'personal' | 'public';

  @Prop({ type: Object, required: true })
  definition!: ComponentDefinitionSnapshot;

  @Prop({ type: String })
  thumbnail?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ComponentPresetSchema = SchemaFactory.createForClass(ComponentPreset);
