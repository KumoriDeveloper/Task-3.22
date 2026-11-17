import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { ProjectsAdminResolver } from './projects.admin.resolver';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';

@Module({
  imports: [ProfileModule],
  providers: [ProjectsService, ProjectsResolver, ProjectsAdminResolver],
})
export class ProjectsModule {}
