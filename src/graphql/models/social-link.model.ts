import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { LinkKind } from '../enums';

@ObjectType({ description: 'External professional resource (GitHub, LinkedIn, website, …)' })
export class SocialLinkModel {
  @Field(() => ID)
  id!: string;

  @Field()
  label!: string;

  @Field()
  url!: string;

  @Field(() => LinkKind)
  kind!: LinkKind;

  @Field(() => Int)
  sortOrder!: number;
}
