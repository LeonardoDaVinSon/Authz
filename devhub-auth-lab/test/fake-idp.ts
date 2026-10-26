import { createHash, randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

// A minimal OpenID Provider for tests: discovery, JWKS, authorize (auto-consents), token with PKCE.
export interface FakeIdpOptions {
  clientId: string;
  clientSecret?: string;
  email: string;
}

export interface FakeIdp {
  issuer: string;
  // Per-test misbehaviour switches.
  faults: { wrongNonce?: boolean; wrongAudience?: boolean; foreignKey?: boolean };
  close(): Promise<void>;
}

interface PendingCode {
  redirectUri: string;
  nonce: string;
  codeChallenge: string;
}

function readBody(req: IncomingMessage): Promise<URLSearchParams> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(new URLSearchParams(body)));
  });
}

export async function startFakeIdp(options: FakeIdpOptions): Promise<FakeIdp> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const foreign = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const codes = new Map<string, PendingCode>();
  const faults: FakeIdp['faults'] = {};
  let issuer = '';

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url!, issuer);
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/.well-known/openid-configuration') {
      return json(200, {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/logout`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      });
    }
    if (url.pathname === '/jwks') return json(200, { keys: [jwk] });

    if (url.pathname === '/authorize') {
      const params = url.searchParams;
      if (params.get('client_id') !== options.clientId || params.get('code_challenge_method') !== 'S256') {
        return json(400, { error: 'invalid_request' });
      }
      const code = randomBytes(16).toString('hex');
      codes.set(code, { redirectUri: params.get('redirect_uri')!, nonce: params.get('nonce')!, codeChallenge: params.get('code_challenge')! });
      const target = new URL(params.get('redirect_uri')!);
      target.searchParams.set('code', code);
      target.searchParams.set('state', params.get('state')!);
      res.writeHead(302, { location: target.href });
      return res.end();
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      const body = await readBody(req);
      const pending = codes.get(body.get('code') ?? '');
      codes.delete(body.get('code') ?? '');
      if (!pending || body.get('redirect_uri') !== pending.redirectUri) return json(400, { error: 'invalid_grant' });
      if (body.get('client_id') !== options.clientId || (options.clientSecret && body.get('client_secret') !== options.clientSecret)) {
        return json(401, { error: 'invalid_client' });
      }
      const challenge = createHash('sha256').update(body.get('code_verifier') ?? '').digest('base64url');
      if (challenge !== pending.codeChallenge) return json(400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });

      const idToken = await new SignJWT({ email: options.email, email_verified: true, name: 'OIDC Tester', nonce: faults.wrongNonce ? 'other' : pending.nonce })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(issuer)
        .setSubject('idp-user-42')
        .setAudience(faults.wrongAudience ? 'someone-else' : options.clientId)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(faults.foreignKey ? foreign.privateKey : privateKey);
      return json(200, { access_token: randomBytes(24).toString('base64url'), token_type: 'Bearer', expires_in: 300, scope: 'openid profile email', id_token: idToken });
    }

    json(404, { error: 'not_found' });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { issuer, faults, close: () => new Promise((resolve) => server.close(() => resolve())) };
}
