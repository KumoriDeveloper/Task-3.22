import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GraphqlLoaders } from '../graphql/context';
import { ProjectModel } from '../graphql/models/project.model';
import { SkillModel } from '../graphql/models/skill.model';

/**
 * Only a field resolver lives here: the project list is reached through
 * `profile { projects }`. Keeping the type resolver separate from the admin
 * mutations makes the read/write split explicit.
 */
@Resolver(() => ProjectModel)
export class ProjectsResolver {
  @ResolveField(() => [SkillModel], {
    description: 'Skills of the profile that this project uses',
  })
  technologies(
    @Parent() project: ProjectModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<SkillModel[]> {
    return loaders.technologiesByProjectId.load(project.id);
  }
}
