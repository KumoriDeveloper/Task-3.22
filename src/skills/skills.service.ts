import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { CreateSkillInput, UpdateSkillInput } from '../graphql/inputs/skill.input';
import { SkillModel } from '../graphql/models/skill.model';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  async list(): Promise<SkillModel[]> {
    const profileId = await this.profileService.getProfileId();

    return this.prisma.skill.findMany({
      where: { profileId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateSkillInput): Promise<SkillModel> {
    const profileId = await this.profileService.getProfileId();

    try {
      return await this.prisma.skill.create({
        data: {
          profileId,
          name: input.name.trim(),
          category: input.category,
          level: input.level,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    } catch (error) {
      this.rethrowDuplicate(error, input.name);
    }
  }

  async update(id: string, input: UpdateSkillInput): Promise<SkillModel> {
    const skill = await this.getById(id);
    const data: Prisma.SkillUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }
    if (input.category !== undefined) {
      data.category = input.category;
    }
    if (input.level !== undefined) {
      data.level = input.level;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
    }

    try {
      return await this.prisma.skill.update({ where: { id: skill.id }, data });
    } catch (error) {
      this.rethrowDuplicate(error, input.name ?? skill.name);
    }
  }

  async remove(id: string): Promise<boolean> {
    const skill = await this.getById(id);
    // Implicit many-to-many join rows between projects and skills are removed by the
    // database cascade, so projects stay valid without extra bookkeeping.
    await this.prisma.skill.delete({ where: { id: skill.id } });
    return true;
  }

  private async getById(id: string): Promise<SkillModel> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });

    if (!skill) {
      throw new NotFoundException(`Skill ${id} was not found`);
    }

    return skill;
  }

  private rethrowDuplicate(error: unknown, name: string): never {
    if (isUniqueConstraintError(error)) {
      throw new ConflictException(`Skill "${name}" is already in the skillset`);
    }
    throw error;
  }
}
