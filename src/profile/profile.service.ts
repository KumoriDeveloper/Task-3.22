import { Injectable, NotFoundException } from '@nestjs/common';
import { nullablePatch } from '../common/normalize';
import { UpdateProfileInput } from '../graphql/inputs/profile.input';
import { ProfileModel } from '../graphql/models/profile.model';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The profile is a singleton aggregate root: every other entity of the card belongs
 * to it, so this service is also the place that answers "which profile are we
 * working with?".
 */
@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<ProfileModel> {
    const profile = await this.prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!profile) {
      throw new NotFoundException('Portfolio profile has not been initialised yet');
    }

    return profile;
  }

  async getProfileId(): Promise<string> {
    return (await this.getProfile()).id;
  }

  /** Prisma ignores `undefined`, so fields absent from the input stay untouched. */
  async updateProfile(input: UpdateProfileInput): Promise<ProfileModel> {
    const profile = await this.getProfile();

    return this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        name: input.name?.trim(),
        headline: input.headline?.trim(),
        description: input.description?.trim(),
        email: input.email?.trim().toLowerCase(),
        location: nullablePatch(input.location),
        avatarUrl: nullablePatch(input.avatarUrl),
      },
    });
  }
}
