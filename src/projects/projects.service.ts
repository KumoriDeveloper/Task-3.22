import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { nullable, nullablePatch } from '../common/normalize';
import { CreateProjectInput, UpdateProjectInput } from '../graphql/inputs/project.input';
import { ProjectModel } from '../graphql/models/project.model';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  async create(input: CreateProjectInput): Promise<ProjectModel> {
    const profileId = await this.profileService.getProfileId();
    const technologyIds = await this.resolveTechnologyIds(input.technologyIds ?? [], profileId);

    return this.prisma.project.create({
      data: {
        profileId,
        name: input.name.trim(),
        description: nullable(input.description),
        url: nullable(input.url),
        repositoryUrl: nullable(input.repositoryUrl),
        technologies: technologyIds.length
          ? { connect: technologyIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectModel> {
    const project = await this.getById(id);
    const profileId = await this.profileService.getProfileId();
    const technologyIds =
      input.technologyIds !== undefined
        ? await this.resolveTechnologyIds(input.technologyIds, profileId)
        : undefined;

    return this.prisma.project.update({
      where: { id: project.id },
      data: {
        name: input.name?.trim(),
        description: nullablePatch(input.description),
        url: nullablePatch(input.url),
        repositoryUrl: nullablePatch(input.repositoryUrl),
        technologies:
          technologyIds !== undefined
            ? { set: technologyIds.map((skillId) => ({ id: skillId })) }
            : undefined,
      },
    });
  }

  async remove(id: string): Promise<boolean> {
    const project = await this.getById(id);
    await this.prisma.project.delete({ where: { id: project.id } });
    return true;
  }

  /**
   * A project may only reference skills that belong to the same profile.
   * Checking this in the service (not the resolver) keeps the rule in one place and
   * guarantees the many-to-many link can never point at someone else's data.
   */
  private async resolveTechnologyIds(ids: string[], profileId: string): Promise<string[]> {
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return [];
    }

    const found = await this.prisma.skill.findMany({
      where: { id: { in: uniqueIds }, profileId },
      select: { id: true },
    });

    if (found.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Every technologyId must reference a skill that belongs to this profile',
      );
    }

    return uniqueIds;
  }

  private async getById(id: string): Promise<ProjectModel> {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException(`Project ${id} was not found`);
    }

    return project;
  }
}
