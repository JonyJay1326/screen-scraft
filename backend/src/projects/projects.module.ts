import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Screen, ScreenSchema } from '../screens/screen.schema';
import { Project, ProjectSchema } from './project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Screen.name, schema: ScreenSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
