import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiConfigsModule } from './api-configs/api-configs.module';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';
import { ScreensModule } from './screens/screens.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

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
    AuthModule,
    UsersModule,
    ProjectsModule,
    ScreensModule,
    TemplatesModule,
    ApiConfigsModule,
    DataModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
