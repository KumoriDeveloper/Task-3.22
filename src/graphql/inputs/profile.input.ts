import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Every field is optional: the admin panel sends the whole form, and the service
 * applies only the keys that are present.
 *
 * Nullable fields accept an empty string as "clear this value"; the service turns
 * it into NULL. `ValidateIf` keeps `IsUrl` from rejecting that empty string.
 */
@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  headline?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string | null;
}
