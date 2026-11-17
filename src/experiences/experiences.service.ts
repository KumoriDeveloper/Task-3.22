import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { dateOnly, nullable, nullablePatch, stringList } from '../common/normalize';
import { CreateExperienceInput, UpdateExperienceInput } from '../graphql/inputs/experience.input';
import { ExperienceModel } from '../graphql/models/experience.model';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class ExperiencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
  ) {}

  async create(input: CreateExperienceInput): Promise<ExperienceModel> {
    const profileId = await this.profileService.getProfileId();
    const startDate = dateOnly(input.startDate);
    const endDate = input.endDate ? dateOnly(input.endDate) : null;

    this.assertPeriod(startDate, endDate);

    return this.prisma.experience.create({
      data: {
        profileId,
        company: input.company.trim(),
        position: input.position.trim(),
        startDate,
        endDate,
        location: nullable(input.location),
        summary: nullable(input.summary),
        achievements: stringList(input.achievements),
      },
    });
  }

  async update(id: string, input: UpdateExperienceInput): Promise<ExperienceModel> {
    const experience = await this.getById(id);

    // A partial update still has to be validated as a whole: an updated startDate
    // must not end up after an untouched endDate.
    const startDate =
      input.startDate !== undefined ? dateOnly(input.startDate) : experience.startDate;
    const endDate =
      input.endDate !== undefined
        ? input.endDate
          ? dateOnly(input.endDate)
          : null
        : (experience.endDate ?? null);

    this.assertPeriod(startDate, endDate);

    return this.prisma.experience.update({
      where: { id: experience.id },
      data: {
        company: input.company?.trim(),
        position: input.position?.trim(),
        startDate,
        endDate,
        location: nullablePatch(input.location),
        summary: nullablePatch(input.summary),
        achievements: input.achievements ? stringList(input.achievements) : undefined,
      },
    });
  }

  async remove(id: string): Promise<boolean> {
    const experience = await this.getById(id);
    await this.prisma.experience.delete({ where: { id: experience.id } });
    return true;
  }

  private assertPeriod(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }
  }

  private async getById(id: string): Promise<ExperienceModel> {
    const experience = await this.prisma.experience.findUnique({ where: { id } });

    if (!experience) {
      throw new NotFoundException(`Experience ${id} was not found`);
    }

    return experience;
  }
}
