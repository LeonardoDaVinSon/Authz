import { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'devhub.sid';
export const SESSION_MAX_AGE_MS = 15 * 60 * 1000;

export function sessionCookieOptions(): CookieOptions & { sameSite: 'lax' } {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}
