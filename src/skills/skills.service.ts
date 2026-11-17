import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  /** Prisma ignores `undefined`, so fields absent from the input stay untouched. */
  async update(id: string, input: UpdateSkillInput): Promise<SkillModel> {
    const skill = await this.getById(id);

    try {
      return await this.prisma.skill.update({
        where: { id: skill.id },
        data: {
          name: input.name?.trim(),
          category: input.category,
          level: input.level,
          sortOrder: input.sortOrder,
        },
      });
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
