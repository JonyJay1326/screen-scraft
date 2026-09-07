import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataModule } from '../data/data.module';
import { ScreensModule } from '../screens/screens.module';
import { ApiConfig, ApiConfigSchema } from './api-config.schema';
import { ApiConfigsController } from './api-configs.controller';
import { ApiConfigsService } from './api-configs.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiConfig.name, schema: ApiConfigSchema }]),
    ScreensModule,
    DataModule,
  ],
  controllers: [ApiConfigsController],
  providers: [ApiConfigsService],
  exports: [ApiConfigsService],
})
export class ApiConfigsModule {}
