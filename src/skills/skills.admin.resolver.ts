import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSkillInput, UpdateSkillInput } from '../graphql/inputs/skill.input';
import { SkillModel } from '../graphql/models/skill.model';
import { SkillsService } from './skills.service';

@UseGuards(JwtAuthGuard)
@Resolver(() => SkillModel)
export class SkillsAdminResolver {
  constructor(private readonly skillsService: SkillsService) {}

  @Mutation(() => SkillModel, { description: 'Adds a skill to the skillset' })
  createSkill(
    @Args('input', { type: () => CreateSkillInput }) input: CreateSkillInput,
  ): Promise<SkillModel> {
    return this.skillsService.create(input);
  }

  @Mutation(() => SkillModel, { description: 'Updates a skill' })
  updateSkill(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateSkillInput }) input: UpdateSkillInput,
  ): Promise<SkillModel> {
    return this.skillsService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Removes a skill; projects that used it stay intact' })
  deleteSkill(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.skillsService.remove(id);
  }
}
