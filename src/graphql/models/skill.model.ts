import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { SkillCategory, SkillLevel } from '../enums';

@ObjectType({ description: 'A skill from the owner skillset' })
export class SkillModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => SkillCategory)
  category!: SkillCategory;

  @Field(() => SkillLevel)
  level!: SkillLevel;

  @Field(() => Int, { description: 'Manual ordering weight, ascending' })
  sortOrder!: number;
}
