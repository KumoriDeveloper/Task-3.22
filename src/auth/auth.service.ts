import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AdminTokenPayload } from '../graphql/context';
import { AdminModel } from '../graphql/models/admin.model';
import { AuthPayloadModel } from '../graphql/models/auth-payload.model';
import { PrismaService } from '../prisma/prisma.service';

/**
 * bcrypt hash of a throwaway string. Compared when the email is unknown so the
 * response time does not reveal whether an account exists.
 */
const DUMMY_PASSWORD_HASH = '$2b$10$3ZS8ew96OulL9if8b8LvSedSMmFHYNr1rb1JBvJmBrnyczZOr/xLG';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthPayloadModel> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    const passwordMatches = await bcrypt.compare(
      password,
      admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!admin || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AdminTokenPayload = { sub: admin.id, email: admin.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async me(adminId: string): Promise<AdminModel> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin account no longer exists');
    }

    return admin;
  }
}
