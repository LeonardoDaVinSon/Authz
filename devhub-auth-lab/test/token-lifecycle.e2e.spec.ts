import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DEMO_PASSWORD, MEMBER, createApp } from './app.helper';

describe('Demo 6 — Access token, refresh token, rotation and revocation', () => {
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();
  const login = () => request(server()).post('/tokens/login').send({ email: MEMBER, password: DEMO_PASSWORD }).expect(200);
  const refresh = (refreshToken: string) => request(server()).post('/tokens/refresh').send({ refreshToken });

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('login returns a short-lived JWT access token and an opaque refresh token', async () => {
    const { body } = await login();
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 120, refreshExpiresIn: 1800 });
    expect(body.accessToken.split('.')).toHaveLength(3);
    expect(body.refreshToken).toMatch(/^rt_/);
    await request(server()).get('/api/me').set('Authorization', `Bearer ${body.accessToken}`).expect(200);
  });

  it('wrong credentials are rejected', async () => {
    await request(server()).post('/tokens/login').send({ email: MEMBER, password: 'wrong' }).expect(401);
  });

  it('a refresh token cannot be used as an access token', async () => {
    const { body } = await login();
    await request(server()).get('/api/me').set('Authorization', `Bearer ${body.refreshToken}`).expect(401);
  });

  it('refresh rotates: new pair works, the old refresh token is rejected', async () => {
    const first = (await login()).body;
    const second = (await refresh(first.refreshToken).expect(200)).body;
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    await request(server()).get('/api/me').set('Authorization', `Bearer ${second.accessToken}`).expect(200);
    await refresh(first.refreshToken).expect(401);
  });

  it('reusing a rotated refresh token revokes the whole family, including the newest token', async () => {
    const first = (await login()).body;
    const second = (await refresh(first.refreshToken).expect(200)).body;
    await refresh(first.refreshToken).expect(401);
    await refresh(second.refreshToken).expect(401);

    const { body: families } = await request(server()).get('/lab/tokens').expect(200);
    expect(families[0]).toMatchObject({ revoked: true, revokedReason: 'reuse-detected' });
  });

  it('logout revokes the refresh token', async () => {
    const { body } = await login();
    await request(server()).post('/tokens/logout').send({ refreshToken: body.refreshToken }).expect(204);
    await refresh(body.refreshToken).expect(401);
  });

  it('unknown refresh tokens are rejected and the lab state never exposes full tokens', async () => {
    const { body } = await login();
    await refresh('rt_does-not-exist').expect(401);
    const state = await request(server()).get('/lab/tokens').expect(200);
    expect(JSON.stringify(state.body)).not.toContain(body.refreshToken);
  });
});
