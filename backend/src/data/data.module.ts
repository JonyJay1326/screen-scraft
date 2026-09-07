import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiConfig, ApiConfigSchema } from '../api-configs/api-config.schema';
import { DataController } from './data.controller';
import { DataService } from './data.service';

/** 运行时取数模块 */
@Module({
  imports: [MongooseModule.forFeature([{ name: ApiConfig.name, schema: ApiConfigSchema }])],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
