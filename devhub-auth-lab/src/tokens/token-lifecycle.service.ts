import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DemoUser, DemoUsersService } from '../common/demo-users';
import { JwtValidationService } from '../jwt/jwt-validation.service';

export const SHORT_ACCESS_TTL_SECONDS = 20;
export const REFRESH_TTL_SECONDS = 30 * 60;

export function accessTtlSeconds(): number {
  const configured = Number(process.env.ACCESS_TOKEN_TTL_SECONDS);
  return Number.isInteger(configured) && configured > 0 ? configured : 120;
}

type RefreshStatus = 'active' | 'rotated' | 'revoked';
type RevokeReason = 'logout' | 'reuse-detected';

interface RefreshRecord {
  id: string;
  familyId: string;
  tokenHash: string;
  preview: string;
  issuedAt: number;
  expiresAt: number;
  status: RefreshStatus;
  replacedBy?: string;
}

interface TokenFamily {
  id: string;
  userId: string;
  createdAt: number;
  revokedAt?: number;
  revokedReason?: RevokeReason;
  tokens: RefreshRecord[];
}

export interface TokenPair {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// In-memory refresh-token store for the workshop. Production needs durable, shared storage.
@Injectable()
export class TokenLifecycleService {
  private readonly families = new Map<string, TokenFamily>();
  private readonly byHash = new Map<string, RefreshRecord>();

  constructor(
    private readonly users: DemoUsersService,
    private readonly jwtValidation: JwtValidationService,
  ) {}

  async login(email: string, password: string, shortLived = false): Promise<TokenPair> {
    const user = await this.users.authenticate(email, password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const family: TokenFamily = { id: randomUUID(), userId: user.id, createdAt: Date.now(), tokens: [] };
    this.families.set(family.id, family);
    return this.issuePair(user, family, shortLived);
  }

  refresh(refreshToken: string, shortLived = false): TokenPair {
    const record = this.byHash.get(hashToken(refreshToken));
    const family = record ? this.families.get(record.familyId) : undefined;
    if (!record || !family) throw this.invalid();

    if (family.revokedAt) throw this.invalid();
    if (record.status === 'rotated') {
      // A rotated token came back: either the client or an attacker holds a stale copy. Kill the whole family.
      this.revokeFamily(family, 'reuse-detected');
      throw this.invalid();
    }
    if (record.status !== 'active' || record.expiresAt <= Date.now()) throw this.invalid();

    const user = this.users.findById(family.userId);
    if (!user) throw this.invalid();
    record.status = 'rotated';
    const pair = this.issuePair(user, family, shortLived);
    record.replacedBy = family.tokens[family.tokens.length - 1].id;
    return pair;
  }

  logout(refreshToken: string): void {
    const record = this.byHash.get(hashToken(refreshToken));
    const family = record ? this.families.get(record.familyId) : undefined;
    if (family && !family.revokedAt) this.revokeFamily(family, 'logout');
  }

  state() {
    return [...this.families.values()].reverse().map((family) => ({
      familyId: family.id.slice(0, 8),
      user: this.users.findById(family.userId)?.email ?? family.userId,
      createdAt: new Date(family.createdAt).toISOString(),
      revoked: Boolean(family.revokedAt),
      revokedReason: family.revokedReason ?? null,
      tokens: family.tokens.map((token) => ({
        id: token.id.slice(0, 8),
        preview: token.preview,
        status: token.status,
        issuedAt: new Date(token.issuedAt).toISOString(),
        expiresAt: new Date(token.expiresAt).toISOString(),
        replacedBy: token.replacedBy?.slice(0, 8) ?? null,
      })),
    }));
  }

  reset(): void {
    this.families.clear();
    this.byHash.clear();
  }

  private issuePair(user: DemoUser, family: TokenFamily, shortLived: boolean): TokenPair {
    const expiresIn = shortLived ? SHORT_ACCESS_TTL_SECONDS : accessTtlSeconds();
    const refreshToken = `rt_${randomBytes(32).toString('base64url')}`;
    const now = Date.now();
    const record: RefreshRecord = {
      id: randomUUID(),
      familyId: family.id,
      tokenHash: hashToken(refreshToken),
      preview: `${refreshToken.slice(0, 9)}…`,
      issuedAt: now,
      expiresAt: now + REFRESH_TTL_SECONDS * 1000,
      status: 'active',
    };
    family.tokens.push(record);
    this.byHash.set(record.tokenHash, record);
    return {
      accessToken: this.jwtValidation.issueAccessToken(user, expiresIn),
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      refreshExpiresIn: REFRESH_TTL_SECONDS,
    };
  }

  private revokeFamily(family: TokenFamily, reason: RevokeReason): void {
    family.revokedAt = Date.now();
    family.revokedReason = reason;
    for (const token of family.tokens) if (token.status === 'active') token.status = 'revoked';
  }

  private invalid() {
    // One generic answer for unknown, expired, rotated and revoked tokens.
    return new UnauthorizedException('Invalid refresh token');
  }
}
