import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from './app.helper';

describe('Demo 2 — Password hash and verify', () => {
  let app: NestExpressApplication;
  const password = 'correct-horse-battery';

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(() => app.close());

  it('hashes the same password to different bcrypt strings and verifies both', async () => {
    const server = app.getHttpServer();
    const first = await request(server).post('/password/hash-demo').send({ password }).expect(201);
    const second = await request(server).post('/password/hash-demo').send({ password }).expect(201);

    expect(first.body.hash).toMatch(/^\$2[aby]\$10\$/);
    expect(first.body.hash).not.toBe(second.body.hash);
    expect(first.body.salt).not.toBe(second.body.salt);
    expect(first.body.hash).not.toContain(password);

    for (const hash of [first.body.hash, second.body.hash]) {
      const res = await request(server).post('/password/verify-demo').send({ password, hash }).expect(200);
      expect(res.body.match).toBe(true);
    }
  });

  it('the request inspector never records the password or the full bearer token', async () => {
    const server = app.getHttpServer();
    const token = 'header.payload.signature-that-is-long-enough-to-shorten';
    await request(server).post('/password/hash-demo').send({ password }).expect(201);
    await request(server).get('/api/me').set('Authorization', `Bearer ${token}`).expect(401);
    const log = JSON.stringify((await request(server).get('/lab/inspector').expect(200)).body);
    expect(log).not.toContain(password);
    expect(log).not.toContain(token);
  });

  it('rejects a wrong password', async () => {
    const server = app.getHttpServer();
    const { body } = await request(server).post('/password/hash-demo').send({ password }).expect(201);
    const res = await request(server).post('/password/verify-demo').send({ password: `${password}!`, hash: body.hash }).expect(200);
    expect(res.body.match).toBe(false);
  });

  it('validates input', async () => {
    const server = app.getHttpServer();
    await request(server).post('/password/verify-demo').send({ password, hash: 'plaintext' }).expect(400);
    await request(server).post('/password/hash-demo').send({ password: 'x'.repeat(129) }).expect(400);
    await request(server).post('/password/hash-demo').send({ password, cost: 17 }).expect(400);
    await request(server).post('/password/hash-demo').send({ password, cost: 3 }).expect(400);
  });

  it('rejects oversized request bodies', async () => {
    await request(app.getHttpServer()).post('/password/hash-demo').send({ password: 'x'.repeat(20_000) }).expect(413);
  });
});
