import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { CreateSocialLinkInput } from '../graphql/inputs/social-link.input';
import { SocialLinkModel } from '../graphql/models/social-link.model';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

/** Links to GitHub / LinkedIn / personal site shown next to the profile. */
@Injectable()
export class SocialLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  async create(input: CreateSocialLinkInput): Promise<SocialLinkModel> {
    const profileId = await this.profileService.getProfileId();

    try {
      return await this.prisma.socialLink.create({
        data: {
          profileId,
          label: input.label.trim(),
          url: input.url.trim(),
          kind: input.kind,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This link is already present on the profile');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    const link = await this.prisma.socialLink.findUnique({ where: { id } });

    if (!link) {
      throw new NotFoundException(`Social link ${id} was not found`);
    }

    await this.prisma.socialLink.delete({ where: { id } });
    return true;
  }
}
