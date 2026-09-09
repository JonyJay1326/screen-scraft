import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AiModule } from './ai/ai.module';
import { ApiConfigsModule } from './api-configs/api-configs.module';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { ComponentPresetsModule } from './component-presets/component-presets.module';
import { DataModule } from './data/data.module';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';
import { ScreensModule } from './screens/screens.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    ScreensModule,
    TemplatesModule,
    ApiConfigsModule,
    DataModule,
    WeatherModule,
    AssetsModule,
    AiModule,
    ComponentPresetsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
