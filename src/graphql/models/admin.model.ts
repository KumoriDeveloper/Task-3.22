import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Back-office account' })
export class AdminModel {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;
}
