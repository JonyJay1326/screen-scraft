import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreensModule } from '../screens/screens.module';
import { AiController } from './ai.controller';
import { AiReferenceAssetsService } from './ai-reference-assets.service';
import { AiService } from './ai.service';
import {
  AiReferenceAssetRecord,
  AiReferenceAssetRecordSchema,
  AiSettings,
  AiSettingsSchema,
  KbDoc,
  KbDocSchema,
} from './ai.schema';

@Module({
  imports: [
    ScreensModule,
    MongooseModule.forFeature([
      { name: KbDoc.name, schema: KbDocSchema },
      { name: AiSettings.name, schema: AiSettingsSchema },
      { name: AiReferenceAssetRecord.name, schema: AiReferenceAssetRecordSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AiReferenceAssetsService],
  exports: [AiService],
})
export class AiModule {}
