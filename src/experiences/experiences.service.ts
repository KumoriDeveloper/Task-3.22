import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { dateOnly, nullable, stringList } from '../common/normalize';
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

  async list(): Promise<ExperienceModel[]> {
    const profileId = await this.profileService.getProfileId();

    return this.prisma.experience.findMany({
      where: { profileId },
      orderBy: [{ startDate: 'desc' }, { sortOrder: 'asc' }],
    });
  }

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
        sortOrder: input.sortOrder ?? 0,
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
        location: input.location !== undefined ? nullable(input.location) : undefined,
        summary: input.summary !== undefined ? nullable(input.summary) : undefined,
        achievements: input.achievements !== undefined ? stringList(input.achievements) : undefined,
        sortOrder: input.sortOrder,
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
