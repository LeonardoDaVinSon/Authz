import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Post, Res, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { DemoRole, DevHubClaims, JwtValidationService } from './jwt-validation.service';

@Controller('jwt')
export class JwtController {
  constructor(private readonly jwtValidation: JwtValidationService) {}

  @Post('issue-demo-token')
  issueDemoToken(@Body() body: { subject?: string; role?: string }) {
    const role = body?.role ?? 'member';
    if (role !== 'member' && role !== 'admin') throw new BadRequestException('role must be "member" or "admin"');
    // A teaching endpoint only. Real systems must issue tokens after authenticating a user.
    const accessToken = this.jwtValidation.issueDemoToken(body?.subject, '5m', role as DemoRole);
    return { accessToken, tokenType: 'Bearer', expiresIn: 300 };
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Bearer token required');
    const claims = this.jwtValidation.verifyAccessToken(match[1]);
    return { sub: claims.sub, email: claims.email, role: claims.role ?? null, issuer: claims.iss, audience: claims.aud };
  }

  @Get('admin')
  admin(@Headers('authorization') authorization: string | undefined, @Res({ passthrough: true }) res: Response) {
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="devhub"');
      throw new UnauthorizedException('Bearer token required');
    }

    let claims: DevHubClaims;
    try {
      claims = this.jwtValidation.verifyAccessToken(match[1]);
    } catch (error) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="devhub", error="invalid_token"');
      throw error;
    }

    if (claims.role !== 'admin') {
      throw new ForbiddenException(`Authenticated as ${claims.sub} (${claims.role ?? 'no role'}), but this action requires admin`);
    }
    return { message: 'Welcome to the admin area', sub: claims.sub, role: claims.role };
  }
}
