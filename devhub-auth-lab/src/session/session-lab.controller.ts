import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SessionData } from 'express-session';
import { assertVulnerableModesEnabled } from '../lab/lab-mode';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session.config';

function sessionUser(session?: Partial<SessionData> | null) {
  return session?.userId ? { userId: session.userId, username: session.username, role: session.role ?? null } : null;
}

// Teaching instruments for the session lifecycle. A real service must never reveal or replay session IDs.
@Controller('lab/session')
export class SessionLabController {
  @Get('inspect')
  inspect(@Req() req: Request) {
    const cookie = req.session.cookie;
    return {
      sessionId: req.sessionID,
      authenticated: Boolean(req.session.userId),
      user: sessionUser(req.session),
      cookie: {
        name: SESSION_COOKIE_NAME,
        httpOnly: cookie.httpOnly ?? false,
        secure: cookie.secure ?? false,
        sameSite: cookie.sameSite ?? false,
        path: cookie.path,
        maxAgeMs: cookie.maxAge ?? null,
      },
    };
  }

  // Persists an anonymous session so its ID can be compared with the one issued after login.
  @Post('visit')
  @HttpCode(200)
  visit(@Req() req: Request) {
    req.session.visitedAt ??= new Date().toISOString();
    return { sessionId: req.sessionID, authenticated: Boolean(req.session.userId) };
  }

  // The broken logout: the browser forgets the cookie, but the server still honours the session.
  @Post('forget-cookie')
  @HttpCode(200)
  forgetCookie(@Res({ passthrough: true }) res: Response) {
    assertVulnerableModesEnabled();
    const { maxAge, ...clearOptions } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
    return { cookieCleared: true, serverSessionDestroyed: false };
  }

  @Post('replay')
  @HttpCode(200)
  replay(@Req() req: Request, @Body() body: { sessionId?: string }) {
    assertVulnerableModesEnabled();
    const sessionId = body?.sessionId;
    if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 256) {
      throw new BadRequestException('Provide a sessionId to replay');
    }
    return new Promise((resolve, reject) => {
      req.sessionStore.get(sessionId, (error: unknown, session?: SessionData | null) => {
        if (error) return reject(error);
        const user = sessionUser(session);
        resolve({ sessionId, found: Boolean(session), authenticated: Boolean(user), user });
      });
    });
  }
}
