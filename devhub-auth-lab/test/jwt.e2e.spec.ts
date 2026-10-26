import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from './app.helper';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('Demo 5 — JWT decode, verify and tampering against /api', () => {
  let app: NestExpressApplication;
  let memberToken: string;

  beforeAll(async () => {
    app = await createApp();
    const res = await request(app.getHttpServer()).post('/jwt/issue-demo-token').send({ role: 'member' }).expect(201);
    memberToken = res.body.accessToken;
  });
  afterAll(() => app.close());

  const callAdmin = (token: string) => request(app.getHttpServer()).get('/api/admin').set('Authorization', `Bearer ${token}`);

  it('a valid member token is authenticated (200 on /api/me) but forbidden on /api/admin (403)', async () => {
    await request(app.getHttpServer()).get('/api/me').set('Authorization', `Bearer ${memberToken}`).expect(200);
    await callAdmin(memberToken).expect(403);
  });

  it('a valid admin token from issue-demo-token is 200 on /api/admin', async () => {
    const res = await request(app.getHttpServer()).post('/jwt/issue-demo-token').send({ role: 'admin' }).expect(201);
    const claims = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString());
    expect(claims.sub).toBe('admin-1');
    expect(claims.role).toBe('admin');
    await callAdmin(res.body.accessToken).expect(200);
  });

  it('a payload edited to role=admin keeps the old signature and is rejected with 401', async () => {
    const [header, payload, signature] = memberToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const res = await callAdmin(`${header}.${encode({ ...claims, role: 'admin' })}.${signature}`).expect(401);
    expect(res.headers['www-authenticate']).toContain('error="invalid_token"');
  });

  it('an unsigned alg:none token is rejected with 401', async () => {
    const claims = JSON.parse(Buffer.from(memberToken.split('.')[1], 'base64url').toString());
    await callAdmin(`${encode({ alg: 'none', typ: 'JWT' })}.${encode({ ...claims, role: 'admin' })}.`).expect(401);
  });

  it('every prepared bad fixture is rejected by /api/me, the valid one is accepted', async () => {
    const { body: fixtures } = await request(app.getHttpServer()).get('/lab/jwt/fixtures').expect(200);
    for (const fixture of fixtures) {
      const expected = fixture.failsAt ? 401 : 200;
      await request(app.getHttpServer()).get('/api/me').set('Authorization', `Bearer ${fixture.token}`).expect(expected);
    }
  });

  it('the strict inspector reports the failed check; the naive one accepts the tampered token', async () => {
    const [header, payload, signature] = memberToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const tampered = `${header}.${encode({ ...claims, role: 'admin' })}.${signature}`;
    const strict = await request(app.getHttpServer()).post('/lab/jwt/inspect').send({ token: tampered, mode: 'strict' }).expect(200);
    expect(strict.body.accepted).toBe(false);
    expect(strict.body.steps.find((step: { id: string }) => step.id === 'signature').state).toBe('fail');
    const naive = await request(app.getHttpServer()).post('/lab/jwt/inspect').send({ token: tampered, mode: 'naive' }).expect(200);
    expect(naive.body.accepted).toBe(true);
  });
});
