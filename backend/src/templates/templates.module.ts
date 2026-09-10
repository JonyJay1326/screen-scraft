import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Screen, ScreenSchema } from '../screens/screen.schema';
import { ScreenTemplate, TemplateSchema } from './template.schema';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScreenTemplate.name, schema: TemplateSchema },
      { name: Screen.name, schema: ScreenSchema },
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
