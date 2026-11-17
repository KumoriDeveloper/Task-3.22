import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { SkillCategory, SkillLevel } from '../enums';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

@InputType()
export class CreateSkillInput {
  @Field()
  @IsString()
  @Length(1, 60)
  name!: string;

  @Field(() => SkillCategory)
  @IsEnum(SkillCategory)
  category!: SkillCategory;

  @Field(() => SkillLevel)
  @IsEnum(SkillLevel)
  level!: SkillLevel;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

@InputType()
export class UpdateSkillInput extends PartialType(CreateSkillInput) {}
