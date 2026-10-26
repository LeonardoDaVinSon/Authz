import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DEMO_PASSWORD, MEMBER, cookieValue, createApp, sessionAgent } from './app.helper';

describe('Demo 3/4 — Session, cookie flags and logout', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => {
    delete process.env.LAB_VULNERABLE_MODES;
    return app.close();
  });

  it('login sets an HttpOnly, SameSite=Lax session cookie that carries no password', async () => {
    const res = await request(app.getHttpServer()).post('/session/login').send({ email: MEMBER, password: DEMO_PASSWORD }).expect(201);
    const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const line = setCookie.find((value) => value.startsWith('devhub.sid='))!;
    expect(line).toContain('HttpOnly');
    expect(line).toContain('SameSite=Lax');
    expect(line).toContain('Path=/');
    expect(line).not.toContain('Secure');
    expect(line).not.toContain(DEMO_PASSWORD);
  });

  it('regenerates the session ID at login (fixation defence)', async () => {
    const agent = request.agent(app.getHttpServer());
    const before = await agent.post('/lab/session/visit').expect(200);
    await agent.post('/session/login').send({ email: MEMBER, password: DEMO_PASSWORD }).expect(201);
    const after = await agent.get('/lab/session/inspect').expect(200);
    expect(after.body.authenticated).toBe(true);
    expect(after.body.sessionId).not.toBe(before.body.sessionId);
  });

  it('logout destroys the server session: the old cookie value is rejected afterwards', async () => {
    const server = app.getHttpServer();
    const login = await request(server).post('/session/login').send({ email: MEMBER, password: DEMO_PASSWORD }).expect(201);
    const stolen = cookieValue(login.headers['set-cookie'])!;
    const cookie = `devhub.sid=${stolen}`;

    await request(server).get('/api/me').set('Cookie', cookie).expect(200);
    const logout = await request(server).post('/session/logout').set('Cookie', cookie).expect(204);
    expect(([] as string[]).concat(logout.headers['set-cookie'] ?? []).join()).toMatch(/devhub\.sid=;.*Expires=Thu, 01 Jan 1970/);

    // Replaying the copied cookie must fail: revocation happened on the server, not just in the browser.
    await request(server).get('/api/me').set('Cookie', cookie).expect(401);
  });

  it('clearing only the cookie leaves the server session alive (the broken logout)', async () => {
    const agent = await sessionAgent(app, MEMBER);
    const { body } = await agent.get('/lab/session/inspect').expect(200);
    await agent.post('/lab/session/forget-cookie').expect(200);
    await agent.get('/api/me').expect(401);
    const replay = await request(app.getHttpServer()).post('/lab/session/replay').send({ sessionId: body.sessionId }).expect(200);
    expect(replay.body).toMatchObject({ found: true, authenticated: true });
  });

  it('lab reset clears every session', async () => {
    const agent = await sessionAgent(app, MEMBER);
    await agent.get('/api/me').expect(200);
    await request(app.getHttpServer()).post('/lab/reset').expect(200);
    await agent.get('/api/me').expect(401);
  });

  it('vulnerable lab endpoints can be disabled', async () => {
    process.env.LAB_VULNERABLE_MODES = 'false';
    await request(app.getHttpServer()).post('/lab/session/forget-cookie').expect(403);
    delete process.env.LAB_VULNERABLE_MODES;
  });
});
