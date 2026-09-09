import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComponentPreset, ComponentPresetSchema } from './component-preset.schema';
import { ComponentPresetsController } from './component-presets.controller';
import { ComponentPresetsService } from './component-presets.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ComponentPreset.name, schema: ComponentPresetSchema }])],
  controllers: [ComponentPresetsController],
  providers: [ComponentPresetsService],
})
export class ComponentPresetsModule {}
