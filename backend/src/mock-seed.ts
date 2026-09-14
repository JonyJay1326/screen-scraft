import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { validateProtocol } from '@screencraft/shared';
import { Model } from 'mongoose';
import { ApiConfig } from './api-configs/api-config.schema';
import { AppModule } from './app.module';
import { DataService } from './data/data.service';
import { MockDataset } from './data/mock-dataset.schema';
import { createMockApiDatasets, createMockDataset, MOCK_API_CONFIGS } from './mock-data';

/** 幂等写入 MongoDB Mock 数据集和 API 配置。 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('MockSeed');
  try {
    const mockModel = app.get<Model<MockDataset>>(getModelToken(MockDataset.name));
    const apiModel = app.get<Model<ApiConfig>>(getModelToken(ApiConfig.name));
    const dataService = app.get(DataService);
    const datasets = createMockApiDatasets(createMockDataset());

    await mockModel.bulkWrite(datasets.map((dataset) => ({
      updateOne: {
        filter: { key: dataset.key },
        update: { $set: dataset },
        upsert: true,
      },
    })));

    await apiModel.bulkWrite(MOCK_API_CONFIGS.map((item) => ({
      updateOne: {
        filter: { name: item.name },
        update: {
          $set: {
            name: item.name,
            type: 'mock' as const,
            dataProtocol: item.protocol,
            mockKey: item.mockKey,
            params: item.params,
          },
          $unset: {
            sql: 1 as const,
            external: 1 as const,
            authSecretEnc: 1 as const,
          },
        },
        upsert: true,
      },
    })));
    logger.log(`MongoDB Mock 数据集已幂等写入：${datasets.length} 个`);
    logger.log(`API 配置已幂等写入：${MOCK_API_CONFIGS.length} 个`);

    for (const definition of MOCK_API_CONFIGS) {
      const config = await apiModel.findOne({ name: definition.name }).exec();
      if (!config) throw new Error(`API 配置写入后未找到：${definition.name}`);
      if (config.dataProtocol !== definition.protocol) {
        throw new Error(`${definition.name} 数据协议元数据写入不一致`);
      }
      const raw = await dataService.execute(String(config._id), {});
      const issues = validateProtocol(definition.protocol, raw);
      if (issues.length) {
        throw new Error(`${definition.name} 默认数据协议无效：${issues.map((item) => item.message).join('；')}`);
      }
    }
    logger.log('12 个 Mock API 默认参数运行时验证通过');
  } finally {
    await app.close();
  }
}

void bootstrap();
