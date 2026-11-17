import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ExperienceModel } from './experience.model';
import { ProjectModel } from './project.model';
import { SkillModel } from './skill.model';
import { SocialLinkModel } from './social-link.model';

/**
 * GraphQL representation of the card owner.
 *
 * Relation fields are optional on the class because they are not loaded by the
 * profile query itself: they are filled in by field resolvers (and DataLoaders).
 * That keeps `profile { name }` cheap even though the same type can expose the
 * whole card.
 */
@ObjectType({ description: 'Public persona presented on the digital business card' })
export class ProfileModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ description: 'One-line professional headline' })
  headline!: string;

  @Field({ description: 'Short professional summary' })
  description!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => [SocialLinkModel])
  links?: SocialLinkModel[];

  @Field(() => [SkillModel])
  skills?: SkillModel[];

  @Field(() => [ExperienceModel])
  experiences?: ExperienceModel[];

  @Field(() => [ProjectModel])
  projects?: ProjectModel[];
}
