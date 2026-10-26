import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEMO_PASSWORD } from '../src/common/demo-users';

export const MEMBER = 'member@devhub.local';
export const ADMIN = 'admin@devhub.local';
export { DEMO_PASSWORD };

export async function createApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configureApp(app);
  await app.init();
  return app;
}

export async function sessionAgent(app: NestExpressApplication, email: string) {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/session/login').send({ email, password: DEMO_PASSWORD }).expect(201);
  return agent;
}

export function cookieValue(setCookie: string[] | string | undefined, name = 'devhub.sid'): string | undefined {
  const lines = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = lines.find((candidate) => candidate.startsWith(`${name}=`));
  return line?.split(';')[0].slice(name.length + 1);
}
