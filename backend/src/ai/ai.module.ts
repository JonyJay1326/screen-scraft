import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreensModule } from '../screens/screens.module';
import { AiController } from './ai.controller';
import { AiBorderAssetsService } from './ai-border-assets.service';
import { AiReferenceAssetsService } from './ai-reference-assets.service';
import { AiService } from './ai.service';
import {
  AiBorderAssetRecord,
  AiBorderAssetRecordSchema,
  AiReferenceAssetRecord,
  AiReferenceAssetRecordSchema,
  AiSettings,
  AiSettingsSchema,
  KbDoc,
  KbDocSchema,
} from './ai.schema';

@Module({
  imports: [
    forwardRef(() => ScreensModule),
    MongooseModule.forFeature([
      { name: KbDoc.name, schema: KbDocSchema },
      { name: AiSettings.name, schema: AiSettingsSchema },
      { name: AiReferenceAssetRecord.name, schema: AiReferenceAssetRecordSchema },
      { name: AiBorderAssetRecord.name, schema: AiBorderAssetRecordSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AiReferenceAssetsService, AiBorderAssetsService],
  exports: [AiService, AiBorderAssetsService],
})
export class AiModule {}
