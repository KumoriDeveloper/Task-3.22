import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectInput, UpdateProjectInput } from '../graphql/inputs/project.input';
import { ProjectModel } from '../graphql/models/project.model';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Resolver(() => ProjectModel)
export class ProjectsAdminResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Mutation(() => ProjectModel, { description: 'Adds a project to the card' })
  createProject(
    @Args('input', { type: () => CreateProjectInput }) input: CreateProjectInput,
  ): Promise<ProjectModel> {
    return this.projectsService.create(input);
  }

  @Mutation(() => ProjectModel, { description: 'Updates a project' })
  updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => UpdateProjectInput }) input: UpdateProjectInput,
  ): Promise<ProjectModel> {
    return this.projectsService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Removes a project' })
  deleteProject(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.projectsService.remove(id);
  }
}
