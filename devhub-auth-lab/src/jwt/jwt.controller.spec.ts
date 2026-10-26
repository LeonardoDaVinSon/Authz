import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { JwtController } from './jwt.controller';
import { JwtValidationService } from './jwt-validation.service';

describe('JwtController /jwt/admin', () => {
  const service = new JwtValidationService();
  const controller = new JwtController(service);

  function fakeResponse() {
    const headers: Record<string, string> = {};
    const res = { setHeader: (name: string, value: string) => (headers[name] = value) } as unknown as Response;
    return { res, headers };
  }

  it('returns 401 with a Bearer challenge when no token is sent', () => {
    const { res, headers } = fakeResponse();
    expect(() => controller.admin(undefined, res)).toThrow(UnauthorizedException);
    expect(headers['WWW-Authenticate']).toBe('Bearer realm="devhub"');
  });

  it('returns 401 invalid_token for an expired token', () => {
    const { res, headers } = fakeResponse();
    const expired = service.issueDemoToken('user-123', -60, 'admin');
    expect(() => controller.admin(`Bearer ${expired}`, res)).toThrow(UnauthorizedException);
    expect(headers['WWW-Authenticate']).toContain('error="invalid_token"');
  });

  it('returns 403 for an authenticated member', () => {
    const { res, headers } = fakeResponse();
    expect(() => controller.admin(`Bearer ${service.issueDemoToken('user-123', '5m', 'member')}`, res)).toThrow(ForbiddenException);
    expect(headers['WWW-Authenticate']).toBeUndefined();
  });

  it('returns 200 for an admin', () => {
    const { res } = fakeResponse();
    expect(controller.admin(`Bearer ${service.issueDemoToken('admin-1', '5m', 'admin')}`, res)).toMatchObject({ role: 'admin' });
  });
});
