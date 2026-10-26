import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session/session.config';

export function configureApp(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: '16kb' });

  // Vite frontend runs on port 5173. Cookies require credentialed CORS, so the origin must be explicit.
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['WWW-Authenticate'],
  });

  // Demo configuration: MemoryStore is not suitable for production or multiple instances.
  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: process.env.SESSION_SECRET || 'local-only-session-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: sessionCookieOptions(),
    }),
  );
}
