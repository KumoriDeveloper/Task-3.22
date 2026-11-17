import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateExperienceInput {
  @Field()
  @IsString()
  @Length(1, 120)
  company!: string;

  @Field()
  @IsString()
  @Length(1, 120)
  position!: string;

  @Field()
  @IsDate()
  startDate!: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'null or omitted means the position is current',
  })
  @IsOptional()
  @IsDate()
  endDate?: Date | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  achievements?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

@InputType()
export class UpdateExperienceInput extends PartialType(CreateExperienceInput) {}
