import * as jwt from 'jsonwebtoken';
import { JwtValidationService } from './jwt-validation.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtValidationService', () => {
  const service = new JwtValidationService();
  const secret = process.env.JWT_SECRET || 'local-only-demo-secret-change-me-please-32-chars';

  it('accepts a valid token and returns verified claims', () => {
    const token = service.issueDemoToken();
    expect(service.verifyAccessToken(token)).toMatchObject({ sub: 'user-123', email: 'member@devhub.local' });
  });

  it('rejects a token whose payload was modified without resigning', () => {
    const token = service.issueDemoToken();
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.sub = 'admin';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(() => service.verifyAccessToken(parts.join('.'))).toThrow(UnauthorizedException);
  });

  it('rejects alg:none unsigned tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', email: 'admin@example.test', iss: 'devhub-auth-lab', aud: 'devhub-api', exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
    expect(() => service.verifyAccessToken(`${header}.${payload}.`)).toThrow(UnauthorizedException);
  });

  it('rejects expired tokens', () => {
    const token = jwt.sign({ email: 'alice@example.test' }, secret, {
      algorithm: 'HS256', subject: 'user-123', issuer: 'devhub-auth-lab', audience: 'devhub-api', expiresIn: -10,
    });
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects tokens with the wrong issuer', () => {
    const token = jwt.sign({ email: 'alice@example.test' }, secret, {
      algorithm: 'HS256', subject: 'user-123', issuer: 'other-issuer', audience: 'devhub-api', expiresIn: '5m',
    });
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects tokens with the wrong audience', () => {
    const token = jwt.sign({ email: 'alice@example.test' }, secret, {
      algorithm: 'HS256', subject: 'user-123', issuer: 'devhub-auth-lab', audience: 'other-api', expiresIn: '5m',
    });
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects an algorithm not in the allowlist', () => {
    const token = jwt.sign({ email: 'alice@example.test' }, secret, {
      algorithm: 'HS384', subject: 'user-123', issuer: 'devhub-auth-lab', audience: 'devhub-api', expiresIn: '5m',
    });
    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });
});
