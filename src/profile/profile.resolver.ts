import { Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GraphqlLoaders } from '../graphql/context';
import { ExperienceModel } from '../graphql/models/experience.model';
import { ProfileModel } from '../graphql/models/profile.model';
import { ProjectModel } from '../graphql/models/project.model';
import { SkillModel } from '../graphql/models/skill.model';
import { SocialLinkModel } from '../graphql/models/social-link.model';
import { ProfileService } from './profile.service';

/**
 * Read side of the GraphQL API.
 *
 * The `profile` query loads only the profile row. Every nested collection is a
 * field resolver backed by a per-request DataLoader, so the client pays for exactly
 * the fields it selects and each relation costs one batched query instead of one
 * query per row (see src/graphql/loaders.ts).
 */
@Resolver(() => ProfileModel)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => ProfileModel, {
    name: 'profile',
    description: 'The card owner with all nested data of the digital business card',
  })
  profile(): Promise<ProfileModel> {
    return this.profileService.getProfile();
  }

  @ResolveField(() => [SocialLinkModel], {
    description: 'GitHub, LinkedIn and other professional links',
  })
  links(
    @Parent() profile: ProfileModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<SocialLinkModel[]> {
    return loaders.linksByProfileId.load(profile.id);
  }

  @ResolveField(() => [SkillModel], { description: 'Skillset of the card owner' })
  skills(
    @Parent() profile: ProfileModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<SkillModel[]> {
    return loaders.skillsByProfileId.load(profile.id);
  }

  @ResolveField(() => [ExperienceModel], {
    description: 'Work history, most recent position first',
  })
  experiences(
    @Parent() profile: ProfileModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<ExperienceModel[]> {
    return loaders.experiencesByProfileId.load(profile.id);
  }

  @ResolveField(() => [ProjectModel], { description: 'Selected projects of the card owner' })
  projects(
    @Parent() profile: ProfileModel,
    @Context('loaders') loaders: GraphqlLoaders,
  ): Promise<ProjectModel[]> {
    return loaders.projectsByProfileId.load(profile.id);
  }
}
