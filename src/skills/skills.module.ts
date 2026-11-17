import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { SkillsAdminResolver } from './skills.admin.resolver';
import { SkillsService } from './skills.service';

@Module({
  imports: [ProfileModule],
  providers: [SkillsService, SkillsAdminResolver],
})
export class SkillsModule {}
