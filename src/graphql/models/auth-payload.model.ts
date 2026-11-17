import { Field, ObjectType } from '@nestjs/graphql';
import { AdminModel } from './admin.model';

@ObjectType()
export class AuthPayloadModel {
  @Field({ description: 'JWT to send as "Authorization: Bearer <token>"' })
  accessToken!: string;

  @Field(() => AdminModel)
  admin!: AdminModel;
}
