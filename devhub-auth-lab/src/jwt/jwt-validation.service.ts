import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { DEMO_USERS, DemoRole, DemoUser } from '../common/demo-users';

export type { DemoRole } from '../common/demo-users';

export const JWT_ISSUER = 'devhub-auth-lab';
export const JWT_AUDIENCE = 'devhub-api';
export const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

export function jwtSecret(): string {
  return process.env.JWT_SECRET || 'local-only-demo-secret-change-me-please-32-chars';
}

export interface DevHubClaims extends jwt.JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtValidationService {
  issueDemoToken(subject?: string, expiresIn: jwt.SignOptions['expiresIn'] = '5m', role: DemoRole = 'member'): string {
    const user = DEMO_USERS.find((candidate) => candidate.role === role)!;
    // Default sub to the demo user for that role (member → user-123, admin → admin-1).
    // /api/admin resolves role from the user record by sub, not from the token payload alone.
    return this.issueAccessToken({ ...user, id: subject ?? user.id }, expiresIn);
  }

  issueAccessToken(user: DemoUser, expiresIn: jwt.SignOptions['expiresIn'] = '5m'): string {
    return jwt.sign({ email: user.email, role: user.role }, jwtSecret(), {
      algorithm: 'HS256',
      subject: user.id,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn,
      jwtid: randomUUID(),
    });
  }

  verifyAccessToken(token: string): DevHubClaims {
    try {
      const verified = jwt.verify(token, jwtSecret(), {
        algorithms: JWT_ALGORITHMS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        clockTolerance: 0,
      });

      if (typeof verified === 'string' || typeof verified.sub !== 'string' || typeof verified.email !== 'string') {
        throw new UnauthorizedException('Token claims are invalid');
      }
      return verified as DevHubClaims;
    } catch {
      // Do not leak whether signature, expiry, issuer, audience, or algorithm failed.
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
