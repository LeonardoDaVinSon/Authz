import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { SessionData } from 'express-session';

export type DemoRole = 'member' | 'admin';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: DemoRole;
}

export interface Principal extends DemoUser {
  via: 'session' | 'bearer';
}

// Intentionally public, local-only credentials. Never reuse them anywhere real.
export const DEMO_PASSWORD = 'DevHub-demo-pass-123!';

export const DEMO_USERS: DemoUser[] = [
  { id: 'user-123', email: 'member@devhub.local', name: 'Mai Member', role: 'member' },
  { id: 'admin-1', email: 'admin@devhub.local', name: 'An Admin', role: 'admin' },
];

// Comparing against a fixed hash for unknown emails keeps the response time similar for both failure cases.
const UNKNOWN_USER_HASH = bcrypt.hashSync('no-such-user-placeholder', 10);

@Injectable()
export class DemoUsersService {
  private readonly hashes = new Map(DEMO_USERS.map((user) => [user.id, bcrypt.hashSync(DEMO_PASSWORD, 10)]));

  async authenticate(email: string, password: string): Promise<DemoUser | null> {
    const user = this.findByEmail(email);
    const hash = user ? this.hashes.get(user.id)! : UNKNOWN_USER_HASH;
    const valid = await bcrypt.compare(password, hash);
    return user && valid ? user : null;
  }

  findByEmail(email: string): DemoUser | undefined {
    const normalized = email.trim().toLowerCase();
    return DEMO_USERS.find((user) => user.email === normalized);
  }

  findById(id: string): DemoUser | undefined {
    return DEMO_USERS.find((user) => user.id === id);
  }

  // OIDC users exist only in the session that the callback created; they are not in DEMO_USERS.
  fromSession(session?: Partial<SessionData> | null): DemoUser | undefined {
    if (!session?.userId) return undefined;
    return this.findById(session.userId) ?? (session.oidcUser?.id === session.userId ? session.oidcUser : undefined);
  }
}

export function publicUser(user: DemoUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function readCredentials(body: unknown): { email: string; password: string } {
  const value = (body ?? {}) as Record<string, unknown>;
  const email = typeof value.email === 'string' ? value.email : typeof value.username === 'string' ? value.username : '';
  const password = typeof value.password === 'string' ? value.password : '';
  return { email: email.slice(0, 254), password: password.slice(0, 128) };
}
