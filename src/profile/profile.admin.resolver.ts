import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSocialLinkInput } from '../graphql/inputs/social-link.input';
import { UpdateProfileInput } from '../graphql/inputs/profile.input';
import { ProfileModel } from '../graphql/models/profile.model';
import { SocialLinkModel } from '../graphql/models/social-link.model';
import { ProfileService } from './profile.service';
import { SocialLinksService } from './social-links.service';

/**
 * Admin side of the profile module. The JWT guard is applied at the class level so
 * that every mutation in this file is protected by default: a new mutation cannot
 * be added "publicly" by accident.
 */
@UseGuards(JwtAuthGuard)
@Resolver(() => ProfileModel)
export class ProfileAdminResolver {
  constructor(
    private readonly profileService: ProfileService,
    private readonly socialLinksService: SocialLinksService,
  ) {}

  @Mutation(() => ProfileModel, { description: 'Updates the card owner and returns the new state' })
  updateProfile(
    @Args('input', { type: () => UpdateProfileInput }) input: UpdateProfileInput,
  ): Promise<ProfileModel> {
    return this.profileService.updateProfile(input);
  }

  @Mutation(() => SocialLinkModel, { description: 'Adds a link to a professional resource' })
  createSocialLink(
    @Args('input', { type: () => CreateSocialLinkInput }) input: CreateSocialLinkInput,
  ): Promise<SocialLinkModel> {
    return this.socialLinksService.create(input);
  }

  @Mutation(() => Boolean, { description: 'Removes a professional link' })
  deleteSocialLink(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    return this.socialLinksService.remove(id);
  }
}
