import { Field, ID, InputType, Int, PartialType } from '@nestjs/graphql';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

@InputType()
export class CreateProjectInput {
  @Field()
  @IsString()
  @Length(1, 120)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  repositoryUrl?: string | null;

  @Field(() => [ID], {
    nullable: true,
    description: 'Skills of the profile used by this project; replaces the whole set',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologyIds?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

@InputType()
export class UpdateProjectInput extends PartialType(CreateProjectInput) {}
