import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScreensModule } from '../screens/screens.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSettings, AiSettingsSchema, KbDoc, KbDocSchema } from './ai.schema';

@Module({
  imports: [
    ScreensModule,
    MongooseModule.forFeature([
      { name: KbDoc.name, schema: KbDocSchema },
      { name: AiSettings.name, schema: AiSettingsSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
