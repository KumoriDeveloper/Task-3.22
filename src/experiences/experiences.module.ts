import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { ExperiencesAdminResolver } from './experiences.admin.resolver';
import { ExperiencesService } from './experiences.service';

@Module({
  imports: [ProfileModule],
  providers: [ExperiencesService, ExperiencesAdminResolver],
})
export class ExperiencesModule {}
