import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp, cookieValue } from './app.helper';
import { FakeIdp, startFakeIdp } from './fake-idp';

const OIDC_ENV = ['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_REDIRECT_URI', 'OIDC_ADMIN_EMAILS', 'OIDC_RETURN_TO'];
const CLIENT_ID = 'devhub-web';
const CLIENT_SECRET = 'test-only-client-secret';
const EMAIL = 'oidc.tester@example.test';

function clearOidcEnv() {
  for (const name of OIDC_ENV) delete process.env[name];
}

describe('Demo 7 — OIDC without settings', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    clearOidcEnv();
    app = await createApp();
  });
  afterAll(() => app.close());

  it('falls back to the labelled walkthrough and lists the missing keys', async () => {
    const res = await request(app.getHttpServer()).get('/oidc/status').expect(200);
    expect(res.body).toMatchObject({ mode: 'walkthrough', configured: false, banner: 'FLOW WALKTHROUGH — NO REAL LOGIN' });
    expect(res.body.missing).toEqual(['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID']);
  });

  it('has no login endpoint to fake', async () => {
    await request(app.getHttpServer()).get('/oidc/login').expect(404);
  });
});

describe('Demo 7 — live OIDC Authorization Code + PKCE', () => {
  let app: NestExpressApplication;
  let idp: FakeIdp;
  let warn: jest.SpyInstance;

  // Drives the browser part: DevHub → IdP /authorize → back to DevHub /oidc/callback.
  async function login(agent: ReturnType<typeof request.agent>, tamper?: (search: URLSearchParams) => void) {
    const start = await agent.get('/oidc/login').expect(302);
    const authorize = new URL(start.headers.location);
    const consent = await fetch(authorize, { redirect: 'manual' });
    const callback = new URL(consent.headers.get('location')!);
    tamper?.(callback.searchParams);
    const done = await agent.get(`/oidc/callback?${callback.searchParams}`).expect(302);
    return { authorize, callback, result: new URL(done.headers.location), setCookie: done.headers['set-cookie'] };
  }

  beforeAll(async () => {
    idp = await startFakeIdp({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, email: EMAIL });
    process.env.OIDC_ISSUER_URL = idp.issuer;
    process.env.OIDC_CLIENT_ID = CLIENT_ID;
    process.env.OIDC_CLIENT_SECRET = CLIENT_SECRET;
    process.env.OIDC_REDIRECT_URI = 'http://localhost:3000/oidc/callback';
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
    await idp.close();
    warn.mockRestore();
    clearOidcEnv();
  });
  afterEach(() => {
    idp.faults.wrongNonce = idp.faults.wrongAudience = idp.faults.foreignKey = false;
    delete process.env.OIDC_ADMIN_EMAILS;
  });

  it('reports live mode after discovery and never exposes the client secret', async () => {
    const res = await request(app.getHttpServer()).get('/oidc/status').expect(200);
    expect(res.body).toMatchObject({ mode: 'live', configured: true, clientType: 'confidential', discovery: { ok: true, issuer: idp.issuer } });
    expect(JSON.stringify(res.body)).not.toContain(CLIENT_SECRET);
  });

  it('sends state, nonce and an S256 code_challenge, but never the verifier', async () => {
    const { authorize } = await login(request.agent(app.getHttpServer()));
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorize.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(authorize.searchParams.get('state')).toBeTruthy();
    expect(authorize.searchParams.get('nonce')).toBeTruthy();
    expect(authorize.searchParams.has('code_verifier')).toBe(false);
  });

  it('a valid login creates a DevHub session: /api/me 200, /api/admin 403 for a member', async () => {
    const agent = request.agent(app.getHttpServer());
    const { result } = await login(agent);
    expect(result.searchParams.get('oidc')).toBe('ok');
    expect(result.pathname).toBe('/demo/oidc');

    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ id: 'oidc:idp-user-42', email: EMAIL, role: 'member', authenticatedVia: 'session' });
    await agent.get('/api/admin').expect(403);

    const summary = await agent.get('/oidc/session').expect(200);
    expect(summary.body.checks.map((check: { id: string }) => check.id)).toEqual(['state', 'pkce', 'signature', 'iss', 'aud', 'exp', 'nonce']);
    expect(summary.body.idToken).toMatchObject({ alg: 'RS256', kid: 'test-key', claims: { iss: idp.issuer, aud: CLIENT_ID, sub: 'idp-user-42' } });
    expect(summary.body.accessToken.preview).toMatch(/… \(\d+ chars\)$/);
    expect(summary.body).not.toHaveProperty('idToken.raw');
  });

  it('rotates the session ID at the callback', async () => {
    const agent = request.agent(app.getHttpServer());
    const start = await agent.get('/oidc/login').expect(302);
    const before = cookieValue(start.headers['set-cookie']);
    const consent = await fetch(start.headers.location, { redirect: 'manual' });
    const callback = new URL(consent.headers.get('location')!);
    const done = await agent.get(`/oidc/callback${callback.search}`).expect(302);
    const after = cookieValue(done.headers['set-cookie']);
    expect(before && after && before !== after).toBe(true);
  });

  it('maps OIDC_ADMIN_EMAILS to the admin role', async () => {
    process.env.OIDC_ADMIN_EMAILS = `someone@else.test, ${EMAIL.toUpperCase()}`;
    const agent = request.agent(app.getHttpServer());
    await login(agent);
    await agent.get('/api/admin').expect(200);
  });

  it('rejects a callback whose state does not match', async () => {
    const agent = request.agent(app.getHttpServer());
    const { result } = await login(agent, (search) => search.set('state', 'forged-state'));
    expect(result.searchParams.get('reason')).toBe('state_mismatch');
    await agent.get('/api/me').expect(401);
  });

  it('a replayed callback finds no transaction', async () => {
    const agent = request.agent(app.getHttpServer());
    const { callback } = await login(agent);
    const replay = await agent.get(`/oidc/callback${callback.search}`).expect(302);
    expect(new URL(replay.headers.location).searchParams.get('reason')).toBe('no_transaction');
  });

  it('a callback without a login started in this browser is rejected', async () => {
    const res = await request(app.getHttpServer()).get('/oidc/callback?code=abc&state=xyz').expect(302);
    expect(new URL(res.headers.location).searchParams.get('reason')).toBe('no_transaction');
  });

  it('rejects an ID token with the wrong nonce', async () => {
    idp.faults.wrongNonce = true;
    const agent = request.agent(app.getHttpServer());
    const { result } = await login(agent);
    expect(result.searchParams.get('reason')).toBe('nonce_mismatch');
    await agent.get('/api/me').expect(401);
  });

  it('rejects an ID token signed with a key that is not in the IdP JWKS', async () => {
    idp.faults.foreignKey = true;
    const agent = request.agent(app.getHttpServer());
    const { result } = await login(agent);
    expect(result.searchParams.get('reason')).toBe('id_token_invalid');
    await agent.get('/api/me').expect(401);
  });

  it('rejects an ID token issued for another audience', async () => {
    idp.faults.wrongAudience = true;
    const agent = request.agent(app.getHttpServer());
    const { result } = await login(agent);
    expect(result.searchParams.get('reason')).toBe('id_token_invalid');
    await agent.get('/api/me').expect(401);
  });

  it('passes an IdP error code back without logging anyone in', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.get('/oidc/login').expect(302);
    const res = await agent.get('/oidc/callback?error=access_denied&state=whatever').expect(302);
    const result = new URL(res.headers.location);
    expect(result.searchParams.get('reason')).toBe('idp_error');
    expect(result.searchParams.get('detail')).toBe('access_denied');
    await agent.get('/api/me').expect(401);
  });

  it('logout ends the DevHub session and offers the IdP end-session URL', async () => {
    const agent = request.agent(app.getHttpServer());
    await login(agent);
    const res = await agent.post('/oidc/logout').expect(200);
    expect(res.body.endSessionUrl).toContain(`${idp.issuer}/logout`);
    await agent.get('/api/me').expect(401);
    await agent.get('/oidc/session').expect(401);
  });

  it('never logs tokens or the client secret when rejecting a callback', () => {
    const logged = warn.mock.calls.flat().join('\n');
    expect(logged).not.toContain(CLIENT_SECRET);
    expect(logged).not.toMatch(/eyJ[\w-]{10,}\.[\w-]{10,}/);
  });
});
