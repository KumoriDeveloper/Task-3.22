import { Module } from '@nestjs/common';
import { ProfileAdminResolver } from './profile.admin.resolver';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';
import { SocialLinksService } from './social-links.service';

@Module({
  providers: [ProfileService, SocialLinksService, ProfileResolver, ProfileAdminResolver],
  exports: [ProfileService],
})
export class ProfileModule {}
