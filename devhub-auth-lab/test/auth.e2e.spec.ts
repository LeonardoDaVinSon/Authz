import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { JwtValidationService } from '../src/jwt/jwt-validation.service';
import { ADMIN, DEMO_PASSWORD, MEMBER, createApp, sessionAgent } from './app.helper';

describe('Demo 1 — Authentication vs Authorization (/api/me, /api/admin)', () => {
  let app: NestExpressApplication;
  const jwt = new JwtValidationService();

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('returns 401 with a challenge when no credential is sent', async () => {
    const res = await request(app.getHttpServer()).get('/api/me').expect(401);
    expect(res.headers['www-authenticate']).toBe('Bearer realm="devhub"');
  });

  it('returns 401 for wrong credentials without revealing which part was wrong', async () => {
    const wrongPassword = await request(app.getHttpServer()).post('/session/login').send({ email: MEMBER, password: 'nope' }).expect(401);
    const unknownUser = await request(app.getHttpServer()).post('/session/login').send({ email: 'ghost@devhub.local', password: DEMO_PASSWORD }).expect(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('returns 401 for an expired bearer token', async () => {
    const expired = jwt.issueDemoToken('user-123', -60, 'member');
    await request(app.getHttpServer()).get('/api/me').set('Authorization', `Bearer ${expired}`).expect(401);
  });

  it('member session: /api/me is 200, /api/admin is 403', async () => {
    const agent = await sessionAgent(app, MEMBER);
    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ email: MEMBER, role: 'member', authenticatedVia: 'session' });
    const admin = await agent.get('/api/admin').expect(403);
    expect(admin.headers['www-authenticate']).toBeUndefined();
  });

  it('admin session: /api/admin is 200', async () => {
    const agent = await sessionAgent(app, ADMIN);
    const res = await agent.get('/api/admin').expect(200);
    expect(res.body.user).toMatchObject({ email: ADMIN, role: 'admin' });
  });

  it('member bearer token is 403 on /api/admin, admin bearer token is 200', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/admin').set('Authorization', `Bearer ${jwt.issueDemoToken('user-123', '5m', 'member')}`).expect(403);
    await request(server).get('/api/admin').set('Authorization', `Bearer ${jwt.issueDemoToken('admin-1', '5m', 'admin')}`).expect(200);
  });

  it('an invalid bearer token does not fall back to a valid session cookie', async () => {
    const agent = await sessionAgent(app, ADMIN);
    await agent.get('/api/admin').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });

  it('responses never contain password material', async () => {
    const agent = await sessionAgent(app, MEMBER);
    const res = await agent.get('/api/me').expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });

  it('/health reports ok', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok', service: 'devhub-auth-lab', demoOnly: true });
  });
});
