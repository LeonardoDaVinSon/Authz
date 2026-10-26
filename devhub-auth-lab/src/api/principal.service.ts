import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { DemoUsersService, Principal } from '../common/demo-users';
import { JwtValidationService } from '../jwt/jwt-validation.service';

@Injectable()
export class PrincipalService {
  constructor(
    private readonly users: DemoUsersService,
    private readonly jwtValidation: JwtValidationService,
  ) {}

  // An Authorization header wins over the session cookie and never falls back to it:
  // a bad token must fail loudly instead of silently using another credential.
  resolve(req: Request, res: Response): Principal {
    const authorization = req.headers.authorization;
    if (authorization !== undefined) {
      const match = authorization.match(/^Bearer\s+(\S+)$/i);
      if (!match) return this.reject(res, 'Bearer realm="devhub", error="invalid_request"', 'Bearer token required');
      let claims;
      try {
        claims = this.jwtValidation.verifyAccessToken(match[1]);
      } catch {
        return this.reject(res, 'Bearer realm="devhub", error="invalid_token"', 'Invalid access token');
      }
      // Role comes from the user record, not from the token payload alone.
      const user = this.users.findById(claims.sub) ?? this.users.findByEmail(claims.email);
      if (!user) return this.reject(res, 'Bearer realm="devhub", error="invalid_token"', 'Invalid access token');
      return { ...user, via: 'bearer' };
    }

    const user = this.users.fromSession(req.session);
    if (!user) return this.reject(res, 'Bearer realm="devhub"', 'Authentication required');
    return { ...user, via: 'session' };
  }

  private reject(res: Response, challenge: string, message: string): never {
    res.setHeader('WWW-Authenticate', challenge);
    throw new UnauthorizedException(message);
  }
}
