import { Injectable } from '@nestjs/common';
import * as client from 'openid-client';
import type { DemoUser } from '../common/demo-users';
import { isLocalHttpIssuer, missingOidcSettings, OidcSettings, oidcSettings } from './oidc-settings';
import { availableExtraScopes, mergeScopes } from './oidc-scopes';

export const OIDC_TRANSACTION_TTL_MS = 10 * 60 * 1000;

// Kept server-side in the session between /oidc/login and /oidc/callback; never sent to the browser.
export interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  startedAt: number;
  // Scope string actually sent on /authorize (base + optional Drive extras).
  requestedScope: string;
  extraScopeIds: string[];
}

// Access token kept only for the lab resource call (Google Drive). Never returned to the UI.
export interface OidcStoredAccessToken {
  token: string;
  tokenType: string;
  scope: string | null;
  expiresAt: number | null;
}

export type OidcCheckId =
  | 'state'
  | 'nonce'
  | 'pkce'
  | 'redirect_uri'
  | 'signature'
  | 'iss'
  | 'aud'
  | 'iat'
  | 'exp'
  | 'email_verified';

export interface OidcCheck {
  id: OidcCheckId;
  detail: string;
  value?: string;
}

// What the UI may show about a completed login. The raw access token stays server-side for /oidc/resource/*.
export interface OidcLoginSummary {
  completedAt: string;
  user: DemoUser;
  idToken: { alg: string; kid: string | null; claims: Record<string, unknown> };
  accessToken: {
    tokenType: string;
    expiresIn: number | null;
    // Scope string returned by the token endpoint (may omit some requested scopes).
    scope: string | null;
    requestedScope: string;
    extraScopeIds: string[];
    preview: string;
    // True when DevHub kept the token for a lab resource call (never sent to the browser).
    retainedForResourceCall: boolean;
  };
  refreshTokenIssued: boolean;
  // One-time auth params kept for the teaching UI after a successful login (verifier is shortened).
  params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    codeVerifierPreview: string;
    redirectUri: string;
    emailVerified: boolean | null;
  };
  checks: OidcCheck[];
}

export type OidcFailure =
  | 'discovery_failed'
  | 'idp_error'
  | 'no_transaction'
  | 'transaction_expired'
  | 'state_mismatch'
  | 'nonce_mismatch'
  | 'id_token_invalid'
  | 'token_exchange_failed'
  | 'session_failed';

const SHOWN_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'email', 'email_verified', 'name', 'preferred_username'];

function preview(token: string): string {
  return `${token.slice(0, 10)}… (${token.length} chars)`;
}

function jwtHeader(token: string): { alg?: string; kid?: string } {
  try {
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

// openid-client wraps the precise reason (claim name, signature failure, IdP error) in error.cause.
export function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  const { cause: rawCause, error: idpError } = error as Error & { cause?: unknown; error?: unknown };
  const cause = rawCause instanceof Error ? rawCause.message : '';
  return [error.message, cause, typeof idpError === 'string' ? `IdP error ${idpError}` : '']
    .filter(Boolean)
    .join(' — ')
    .slice(0, 300);
}

export function classifyCallbackError(error: unknown): OidcFailure {
  const detail = errorDetail(error);
  if (/"nonce"/.test(detail)) return 'nonce_mismatch';
  if (/"state"/.test(detail)) return 'state_mismatch';
  if (/signature|JWT|ID Token|claim/i.test(detail)) return 'id_token_invalid';
  return 'token_exchange_failed';
}

@Injectable()
export class OidcService {
  private configuration?: Promise<client.Configuration>;
  private configurationKey?: string;

  async status() {
    const settings = oidcSettings();
    if (!settings) {
      return {
        mode: 'walkthrough' as const,
        liveLoginImplemented: true,
        configured: false,
        missing: missingOidcSettings(),
        banner: 'FLOW WALKTHROUGH — NO REAL LOGIN',
      };
    }

    let discovery: { ok: boolean; issuer?: string; endSessionSupported?: boolean };
    try {
      const metadata = (await this.configure(settings)).serverMetadata();
      discovery = { ok: true, issuer: metadata.issuer, endSessionSupported: Boolean(metadata.end_session_endpoint) };
    } catch {
      discovery = { ok: false };
    }
    return {
      mode: 'live' as const,
      liveLoginImplemented: true,
      configured: true,
      missing: [],
      issuer: settings.issuer,
      clientId: settings.clientId,
      clientType: settings.clientSecret ? 'confidential' : 'public',
      redirectUri: settings.redirectUri,
      scope: settings.scope,
      extraScopes: availableExtraScopes(settings.issuer),
      discovery,
      banner: discovery.ok ? 'LIVE OIDC — REAL IDENTITY PROVIDER' : 'OIDC CONFIGURED — IDENTITY PROVIDER UNREACHABLE',
    };
  }

  async startLogin(
    settings: OidcSettings,
    extras: { ids: string[]; scopes: string[] } = { ids: [], scopes: [] },
  ): Promise<{ url: URL; transaction: OidcTransaction }> {
    const config = await this.configure(settings);
    const requestedScope = mergeScopes(settings.scope, extras.scopes);
    const transaction: OidcTransaction = {
      state: client.randomState(),
      nonce: client.randomNonce(),
      codeVerifier: client.randomPKCECodeVerifier(),
      startedAt: Date.now(),
      requestedScope,
      extraScopeIds: extras.ids,
    };
    const parameters: Record<string, string> = {
      redirect_uri: settings.redirectUri,
      scope: requestedScope,
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: await client.calculatePKCECodeChallenge(transaction.codeVerifier),
      code_challenge_method: 'S256',
    };
    // Extra resource scopes: force the consent screen so the audience sees Drive listed.
    if (extras.scopes.length > 0) parameters.prompt = 'consent';
    const url = client.buildAuthorizationUrl(config, parameters);
    return { url, transaction };
  }

  // openid-client checks state, sends the PKCE verifier, and validates the ID token
  // (JWKS signature, iss, aud, exp, iat, nonce). Any failure throws.
  async finishLogin(settings: OidcSettings, callbackUrl: URL, transaction: OidcTransaction) {
    const config = await this.configure(settings);
    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims()!;
    const header = jwtHeader(tokens.id_token!);
    const alg = header.alg ?? 'unknown';
    const issuedAt = new Date(claims.iat * 1000).toISOString();
    const expiresAt = new Date(claims.exp * 1000).toISOString();
    const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : undefined;
    const name = [claims.name, claims.preferred_username, email, claims.sub].find((value) => typeof value === 'string') as string;
    const emailVerified = typeof claims.email_verified === 'boolean' ? claims.email_verified : null;
    const codeChallenge = await client.calculatePKCECodeChallenge(transaction.codeVerifier);

    const user: DemoUser = {
      id: `oidc:${claims.sub}`,
      email: email ?? claims.sub,
      name,
      role: email && settings.adminEmails.includes(email) ? 'admin' : 'member',
    };
    const params = {
      state: transaction.state,
      nonce: transaction.nonce,
      codeChallenge,
      codeVerifierPreview: preview(transaction.codeVerifier),
      redirectUri: settings.redirectUri,
      emailVerified,
    };
    const checks: OidcCheck[] = [
      { id: 'state', detail: 'Callback state matched the value stored in the session', value: params.state },
      { id: 'nonce', detail: 'nonce matched the value sent in the authorization request', value: params.nonce },
      { id: 'pkce', detail: 'Token endpoint accepted the code_verifier for the S256 code_challenge', value: `S256 · ${params.codeChallenge}` },
      { id: 'redirect_uri', detail: `redirect_uri = ${params.redirectUri}`, value: params.redirectUri },
      { id: 'signature', detail: `ID token signature verified with the IdP JWKS (${alg})`, value: alg },
      { id: 'iss', detail: `iss = ${claims.iss}`, value: String(claims.iss) },
      { id: 'aud', detail: `aud contains client_id ${settings.clientId}`, value: settings.clientId },
      { id: 'iat', detail: `iat ${issuedAt}`, value: issuedAt },
      { id: 'exp', detail: `exp ${expiresAt} is in the future`, value: expiresAt },
    ];
    if (emailVerified !== null) {
      checks.push({
        id: 'email_verified',
        detail: emailVerified ? 'email_verified = true' : 'email_verified = false',
        value: String(emailVerified),
      });
    }
    const summary: OidcLoginSummary = {
      completedAt: new Date().toISOString(),
      user,
      idToken: {
        alg,
        kid: header.kid ?? null,
        claims: Object.fromEntries(SHOWN_CLAIMS.filter((key) => claims[key] !== undefined).map((key) => [key, claims[key]])),
      },
      accessToken: {
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in ?? null,
        scope: tokens.scope ?? null,
        requestedScope: transaction.requestedScope,
        extraScopeIds: transaction.extraScopeIds,
        preview: preview(tokens.access_token),
        retainedForResourceCall: true,
      },
      refreshTokenIssued: Boolean(tokens.refresh_token),
      params,
      checks,
    };
    const access: OidcStoredAccessToken = {
      token: tokens.access_token,
      tokenType: tokens.token_type,
      scope: tokens.scope ?? null,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    };
    return { user, summary, access };
  }

  // Lab instrument: call a Google resource API with the retained access token (not the DevHub session).
  async callDriveResource(access: OidcStoredAccessToken) {
    if (access.expiresAt && Date.now() > access.expiresAt) {
      return { ok: false as const, status: 401, error: 'access_token_expired', hint: 'Sign in again to get a fresh access token.' };
    }
    const hasDriveScope = /googleapis\.com\/auth\/drive/.test(access.scope ?? '');
    const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=5&fields=files(id,name,mimeType),incompleteSearch', {
      headers: { Authorization: `${access.tokenType} ${access.token}` },
    });
    const body = await response.json().catch(() => ({ error: { message: 'non-JSON response' } }));
    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error: body?.error?.message ?? body?.error ?? 'drive_request_failed',
        grantedScope: access.scope,
        hint: hasDriveScope
          ? 'Enable the Google Drive API and add the Drive scope on the OAuth consent screen, then sign in again with the scope checked.'
          : 'No Drive scope on this token (Google may omit scope from the token response). Check "Google Drive (readonly)" before Sign in, enable Drive API + consent scope, then retry.',
      };
    }
    return {
      ok: true as const,
      status: response.status,
      resource: 'https://www.googleapis.com/drive/v3/files',
      grantedScope: access.scope,
      files: Array.isArray(body.files) ? body.files : [],
      note: 'This call used the Google access token (resource). GET /api/me uses the DevHub session cookie instead.',
    };
  }

  async endSessionUrl(settings: OidcSettings): Promise<string | null> {
    try {
      const config = await this.configure(settings);
      if (!config.serverMetadata().end_session_endpoint) return null;
      return client.buildEndSessionUrl(config, { client_id: settings.clientId, post_logout_redirect_uri: settings.returnTo }).href;
    } catch {
      return null;
    }
  }

  private configure(settings: OidcSettings): Promise<client.Configuration> {
    const key = JSON.stringify([settings.issuer, settings.clientId, settings.clientSecret ?? null]);
    if (!this.configuration || this.configurationKey !== key) {
      const execute = [client.enableNonRepudiationChecks];
      if (isLocalHttpIssuer(settings.issuer)) execute.push(client.allowInsecureRequests);
      const auth = settings.clientSecret ? client.ClientSecretPost(settings.clientSecret) : client.None();
      this.configurationKey = key;
      this.configuration = client.discovery(new URL(settings.issuer), settings.clientId, undefined, auth, { execute, timeout: 5 });
      // A failed discovery (IdP down, wrong URL) must not be cached forever.
      this.configuration.catch(() => {
        if (this.configurationKey === key) this.configuration = undefined;
      });
    }
    return this.configuration;
  }
}
