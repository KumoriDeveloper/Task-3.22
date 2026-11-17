import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExperienceInput, UpdateExperienceInput } from '../graphql/inputs/experience.input';
import { ExperienceModel } from '../graphql/models/experience.model';
import { ExperiencesService } from './experiences.service';

@UseGuards(JwtAuthGuard)
@Resolver(() => ExperienceModel)
export class ExperiencesAdminResolver {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Mutation(() => ExperienceModel, { description: 'Adds a position to the work history' })
  createExperience(
    @Args('input', { type: () => CreateExperienceInput }) input: CreateExperienceInput,
  ): Promise<ExperienceModel> {
    return this.experiencesService.create(input);
  }

  @Mutation(() => ExperienceModel, { description: 'Updates a position in the work history' })
  updateExperience(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateExperienceInput }) input: UpdateExperienceInput,
  ): Promise<ExperienceModel> {
    return this.experiencesService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Removes a position from the work history' })
  deleteExperience(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.experiencesService.remove(id);
  }
}
