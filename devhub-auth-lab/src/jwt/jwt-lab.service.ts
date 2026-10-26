import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { assertVulnerableModesEnabled } from '../lab/lab-mode';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER, JwtValidationService, jwtSecret } from './jwt-validation.service';

export type VerifierMode = 'naive' | 'strict';
export type StepState = 'pass' | 'fail' | 'skipped' | 'not-reached';
export type CheckId = 'alg' | 'signature' | 'iss' | 'aud' | 'exp' | 'nbf' | 'claims';

export interface VerificationStep {
  id: string;
  label: string;
  state: StepState;
  detail: string;
}

export interface JwtFixture {
  id: string;
  label: string;
  description: string;
  failsAt: CheckId | null;
  token: string;
}

export interface InspectionResult {
  mode: VerifierMode;
  accepted: boolean;
  httpStatus: 200 | 401;
  publicResponse: Record<string, unknown>;
  steps: VerificationStep[];
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
}

const CHECK_LABELS: Record<CheckId, string> = {
  alg: `alg is in the allowlist [${JWT_ALGORITHMS.join(', ')}]`,
  signature: 'Signature matches the server key',
  iss: `iss is "${JWT_ISSUER}"`,
  aud: `aud includes "${JWT_AUDIENCE}"`,
  exp: 'exp is in the future',
  nbf: 'nbf is not in the future',
  claims: 'Required claims sub and email exist',
};

const CHECK_ORDER: CheckId[] = ['alg', 'signature', 'iss', 'aud', 'exp', 'nbf', 'claims'];

interface DecodedToken {
  header: Record<string, any>;
  payload: Record<string, any>;
  signingInput: string;
  signature: string;
}

function decodeParts(token: string): DecodedToken | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') return null;
    return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: parts[2] };
  } catch {
    return null;
  }
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function relativeSeconds(epochSeconds: number, now: number): string {
  const delta = epochSeconds - now;
  return delta >= 0 ? `in ${delta}s` : `${-delta}s ago`;
}

@Injectable()
export class JwtLabService {
  constructor(private readonly validation: JwtValidationService) {}

  fixtures(): JwtFixture[] {
    const secret = jwtSecret();
    const valid = this.validation.issueDemoToken('user-123', '5m', 'member');
    const [header, payload, signature] = valid.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const sign = (options: jwt.SignOptions) =>
      jwt.sign({ email: 'member@devhub.local', role: 'member' }, secret, {
        algorithm: 'HS256',
        subject: 'user-123',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: '5m',
        ...options,
      });

    return [
      { id: 'valid', label: 'Valid', description: 'Signed by the lab API with every expected claim.', failsAt: null, token: valid },
      {
        id: 'tampered',
        label: 'Tampered role',
        description: 'Payload changed to role "admin" after signing. The old signature is kept.',
        failsAt: 'signature',
        token: `${header}.${encodeJson({ ...claims, role: 'admin' })}.${signature}`,
      },
      {
        id: 'alg-none',
        label: 'alg: none',
        description: 'Unsigned token that claims to be admin.',
        failsAt: 'alg',
        token: `${encodeJson({ alg: 'none', typ: 'JWT' })}.${encodeJson({ ...claims, role: 'admin' })}.`,
      },
      {
        id: 'hs384',
        label: 'HS384',
        description: 'Correctly signed with the right key, but with an algorithm the API does not allow.',
        failsAt: 'alg',
        token: sign({ algorithm: 'HS384' }),
      },
      { id: 'expired', label: 'Expired', description: 'Signed correctly, but exp passed a minute ago.', failsAt: 'exp', token: sign({ expiresIn: -60 }) },
      {
        id: 'wrong-iss',
        label: 'Wrong issuer',
        description: 'Signed correctly, but issued by "evil-issuer".',
        failsAt: 'iss',
        token: sign({ issuer: 'evil-issuer' }),
      },
      {
        id: 'wrong-aud',
        label: 'Wrong audience',
        description: 'Signed correctly, but meant for "billing-api".',
        failsAt: 'aud',
        token: sign({ audience: 'billing-api' }),
      },
      {
        id: 'not-yet',
        label: 'Not yet valid',
        description: 'Signed correctly, but nbf is 10 minutes in the future.',
        failsAt: 'nbf',
        token: sign({ notBefore: '10m', expiresIn: '20m' }),
      },
    ];
  }

  inspect(token: string, mode: VerifierMode): InspectionResult {
    if (mode === 'naive') assertVulnerableModesEnabled();

    const decoded = decodeParts(token);
    if (!decoded) {
      return this.result(mode, false, [
        { id: 'format', label: 'Three Base64URL parts with JSON header and payload', state: 'fail', detail: 'Not a parseable JWT' },
      ], null, null);
    }

    const steps: VerificationStep[] = [
      { id: 'format', label: 'Three Base64URL parts with JSON header and payload', state: 'pass', detail: 'Parsed' },
    ];

    if (mode === 'naive') {
      steps.push({ id: 'decode', label: 'Decode payload and trust it', state: 'pass', detail: 'jwt.decode() only reads claims' });
      for (const id of CHECK_ORDER) {
        steps.push({ id, label: CHECK_LABELS[id], state: 'skipped', detail: 'Never checked by this verifier' });
      }
      const accepted = typeof decoded.payload.sub === 'string';
      return this.result(mode, accepted, steps, decoded.header, decoded.payload);
    }

    let failed = false;
    for (const id of CHECK_ORDER) {
      if (failed) {
        steps.push({ id, label: CHECK_LABELS[id], state: 'not-reached', detail: 'Stopped at the first failed check' });
        continue;
      }
      const outcome = this.check(id, decoded);
      steps.push({ id, label: CHECK_LABELS[id], state: outcome.ok ? 'pass' : 'fail', detail: outcome.detail });
      failed = !outcome.ok;
    }

    let libraryAccepted = true;
    try {
      this.validation.verifyAccessToken(token);
    } catch {
      libraryAccepted = false;
    }
    steps.push({
      id: 'library',
      label: 'jsonwebtoken.verify() with the same policy',
      state: libraryAccepted ? 'pass' : 'fail',
      detail: libraryAccepted ? 'Accepted' : 'Rejected',
    });

    return this.result(mode, libraryAccepted && !failed, steps, decoded.header, decoded.payload);
  }

  private check(id: CheckId, decoded: DecodedToken): { ok: boolean; detail: string } {
    const { header, payload } = decoded;
    const now = Math.floor(Date.now() / 1000);
    switch (id) {
      case 'alg': {
        const alg = String(header.alg ?? '');
        const ok = (JWT_ALGORITHMS as string[]).includes(alg);
        return { ok, detail: ok ? `alg = ${alg}` : `"${alg || 'missing'}" is not allowed` };
      }
      case 'signature': {
        const expected = createHmac('sha256', jwtSecret()).update(decoded.signingInput).digest();
        const actual = Buffer.from(decoded.signature, 'base64url');
        const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
        return { ok, detail: ok ? 'Matches' : 'Does not match the header and payload' };
      }
      case 'iss': {
        const ok = payload.iss === JWT_ISSUER;
        return { ok, detail: `iss = ${payload.iss ?? 'missing'}` };
      }
      case 'aud': {
        const aud = payload.aud;
        const ok = aud === JWT_AUDIENCE || (Array.isArray(aud) && aud.includes(JWT_AUDIENCE));
        return { ok, detail: `aud = ${Array.isArray(aud) ? aud.join(', ') : aud ?? 'missing'}` };
      }
      case 'exp': {
        if (typeof payload.exp !== 'number') return { ok: false, detail: 'exp is missing' };
        return { ok: payload.exp > now, detail: `expires ${relativeSeconds(payload.exp, now)}` };
      }
      case 'nbf': {
        if (payload.nbf === undefined) return { ok: true, detail: 'Not present' };
        if (typeof payload.nbf !== 'number') return { ok: false, detail: 'nbf is not a number' };
        return { ok: payload.nbf <= now, detail: `valid from ${relativeSeconds(payload.nbf, now)}` };
      }
      case 'claims': {
        const ok = typeof payload.sub === 'string' && typeof payload.email === 'string';
        return { ok, detail: ok ? `sub = ${payload.sub}` : 'sub or email is missing' };
      }
    }
  }

  private result(
    mode: VerifierMode,
    accepted: boolean,
    steps: VerificationStep[],
    header: Record<string, unknown> | null,
    payload: Record<string, unknown> | null,
  ): InspectionResult {
    const publicResponse = accepted && payload
      ? { sub: payload.sub, email: payload.email, role: payload.role ?? null }
      : { statusCode: 401, message: 'Invalid access token', error: 'Unauthorized' };
    return { mode, accepted, httpStatus: accepted ? 200 : 401, publicResponse, steps, header, payload };
  }
}
