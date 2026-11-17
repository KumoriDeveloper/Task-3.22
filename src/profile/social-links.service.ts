import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { CreateSocialLinkInput, UpdateSocialLinkInput } from '../graphql/inputs/social-link.input';
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

  async list(): Promise<SocialLinkModel[]> {
    const profileId = await this.profileService.getProfileId();

    return this.prisma.socialLink.findMany({
      where: { profileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(input: CreateSocialLinkInput): Promise<SocialLinkModel> {
    const profileId = await this.profileService.getProfileId();

    try {
      return await this.prisma.socialLink.create({
        data: {
          profileId,
          label: input.label.trim(),
          url: input.url.trim(),
          kind: input.kind,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This link is already present on the profile');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateSocialLinkInput): Promise<SocialLinkModel> {
    const link = await this.getById(id);
    const data: Prisma.SocialLinkUpdateInput = {};

    if (input.label !== undefined) {
      data.label = input.label.trim();
    }
    if (input.url !== undefined) {
      data.url = input.url.trim();
    }
    if (input.kind !== undefined) {
      data.kind = input.kind;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
    }

    try {
      return await this.prisma.socialLink.update({ where: { id: link.id }, data });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This link is already present on the profile');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    const link = await this.getById(id);
    await this.prisma.socialLink.delete({ where: { id: link.id } });
    return true;
  }

  private async getById(id: string): Promise<SocialLinkModel> {
    const link = await this.prisma.socialLink.findUnique({ where: { id } });

    if (!link) {
      throw new NotFoundException(`Social link ${id} was not found`);
    }

    return link;
  }
}
