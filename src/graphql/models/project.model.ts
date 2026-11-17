import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { SkillModel } from './skill.model';

@ObjectType({ description: 'A project the owner worked on or built' })
export class ProjectModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  url?: string | null;

  @Field(() => String, { nullable: true })
  repositoryUrl?: string | null;

  @Field(() => Int)
  sortOrder!: number;

  /** Resolved through a DataLoader — see src/graphql/loaders.ts. */
  @Field(() => [SkillModel], { description: 'Skills of the profile that this project uses' })
  technologies?: SkillModel[];
}
