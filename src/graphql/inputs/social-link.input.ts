import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { LinkKind } from '../enums';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

@InputType()
export class UpdateSocialLinkInput extends PartialType(CreateSocialLinkInput) {}
