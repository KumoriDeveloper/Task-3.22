import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A position held by the owner' })
export class ExperienceModel {
  @Field(() => ID)
  id!: string;

  @Field()
  company!: string;

  @Field()
  position!: string;

  @Field({ description: 'ISO date, the first day of the period' })
  startDate!: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'ISO date, null for the current position',
  })
  endDate?: Date | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => [String], { description: 'Concrete outcomes of the role' })
  achievements!: string[];

  @Field(() => Int)
  sortOrder!: number;
}
