import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import { LinkKind } from '../enums';

@InputType()
export class CreateSocialLinkInput {
  @Field({ description: 'Human readable label, e.g. "GitHub"' })
  @IsString()
  @Length(1, 80)
  label!: string;

  @Field()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @Field(() => LinkKind)
  @IsEnum(LinkKind)
  kind!: LinkKind;
}
