import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nullable } from '../common/normalize';
import { UpdateProfileInput } from '../graphql/inputs/profile.input';
import { ProfileModel } from '../graphql/models/profile.model';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Business logic for the card owner. The profile is a singleton aggregate root:
 * every other entity of the card hangs off it, so this service is also the place
 * that answers "which profile are we working with?".
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
    const profile = await this.prisma.profile.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!profile) {
      throw new NotFoundException('Portfolio profile has not been initialised yet');
    }

    return profile.id;
  }

  async updateProfile(input: UpdateProfileInput): Promise<ProfileModel> {
    const profile = await this.getProfile();
    const data: Prisma.ProfileUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }
    if (input.headline !== undefined) {
      data.headline = input.headline.trim();
    }
    if (input.description !== undefined) {
      data.description = input.description.trim();
    }
    if (input.email !== undefined) {
      data.email = input.email.trim().toLowerCase();
    }
    if (input.location !== undefined) {
      data.location = nullable(input.location);
    }
    if (input.avatarUrl !== undefined) {
      data.avatarUrl = nullable(input.avatarUrl);
    }

    return this.prisma.profile.update({ where: { id: profile.id }, data });
  }
}
