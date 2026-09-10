import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../projects/project.schema';
import { AiModule } from '../ai/ai.module';
import { Screen, ScreenSchema } from './screen.schema';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';

@Module({
  imports: [
    forwardRef(() => AiModule),
    MongooseModule.forFeature([
      { name: Screen.name, schema: ScreenSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [ScreensController],
  providers: [ScreensService],
  exports: [ScreensService],
})
export class ScreensModule {}
