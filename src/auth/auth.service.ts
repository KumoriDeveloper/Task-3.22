import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AdminTokenPayload } from '../graphql/context';
import { AdminModel } from '../graphql/models/admin.model';
import { AuthPayloadModel } from '../graphql/models/auth-payload.model';
import { PrismaService } from '../prisma/prisma.service';

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

    // bcrypt.compare runs only when the account exists, but both branches return the
    // same generic error so the endpoint does not reveal which emails are registered.
    const passwordMatches = admin ? await bcrypt.compare(password, admin.passwordHash) : false;

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
