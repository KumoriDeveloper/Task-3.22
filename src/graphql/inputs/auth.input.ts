import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
