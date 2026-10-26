import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { MemoryStore, SessionData } from 'express-session';
import { SessionLabController } from './session-lab.controller';

describe('SessionLabController replay', () => {
  const controller = new SessionLabController();
  const store = new MemoryStore();
  const req = { sessionStore: store } as unknown as Request;
  const save = (sid: string, data: Partial<SessionData>) =>
    new Promise<void>((resolve) => store.set(sid, { cookie: { originalMaxAge: 60000 }, ...data } as SessionData, () => resolve()));

  afterEach(() => {
    delete process.env.LAB_VULNERABLE_MODES;
  });

  it('authenticates a stolen ID with nothing but the ID', async () => {
    await save('ghost-id', { userId: 'user-123', username: 'member@devhub.local', role: 'member' });
    await expect(controller.replay(req, { sessionId: 'ghost-id' })).resolves.toMatchObject({ found: true, authenticated: true, user: { username: 'member@devhub.local', role: 'member' } });
  });

  it('rejects the ID once the session is destroyed', async () => {
    await new Promise<void>((resolve) => store.destroy('ghost-id', () => resolve()));
    await expect(controller.replay(req, { sessionId: 'ghost-id' })).resolves.toMatchObject({ found: false, authenticated: false });
  });

  it('does not authenticate an anonymous session', async () => {
    await save('anon-id', { visitedAt: 'now' });
    await expect(controller.replay(req, { sessionId: 'anon-id' })).resolves.toMatchObject({ found: true, authenticated: false });
  });

  it('is disabled when vulnerable modes are off', () => {
    process.env.LAB_VULNERABLE_MODES = 'false';
    expect(() => controller.replay(req, { sessionId: 'ghost-id' })).toThrow(ForbiddenException);
  });
});
