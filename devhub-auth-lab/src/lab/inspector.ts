import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export interface InspectorEntry {
  id: number;
  at: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  cookie?: string;
  authorization?: string;
  setCookie: string[];
  wwwAuthenticate?: string;
}

const MAX_ENTRIES = 40;
const IGNORED_PATHS = ['/lab/inspector', '/lab/config'];
const entries: InspectorEntry[] = [];
let sequence = 0;

export function inspectorEntries(): InspectorEntry[] {
  return [...entries].reverse();
}

export function clearInspector(): void {
  entries.length = 0;
}

function shorten(value: string, keep = 12): string {
  return value.length <= keep ? value : `${value.slice(0, keep)}…`;
}

export function redactCookieHeader(header?: string): string | undefined {
  if (!header) return undefined;
  return header
    .split(';')
    .map((part) => {
      const [name, ...rest] = part.trim().split('=');
      return `${name}=${shorten(rest.join('='))}`;
    })
    .join('; ');
}

export function redactSetCookie(line: string): string {
  const [pair, ...attributes] = line.split(';');
  const index = pair.indexOf('=');
  const name = pair.slice(0, index).trim();
  const value = pair.slice(index + 1);
  return [`${name}=${shorten(value)}`, ...attributes.map((attribute) => attribute.trim())].join('; ');
}

export function redactAuthorization(header?: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(/^(\S+)\s+(.+)$/);
  if (!match) return shorten(header);
  return `${match[1]} ${shorten(match[2], 16)} (${match[2].length} chars)`;
}

@Injectable()
export class InspectorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];
    if (req.method === 'OPTIONS' || IGNORED_PATHS.some((ignored) => path.startsWith(ignored))) return next();

    const started = Date.now();
    res.on('finish', () => {
      const raw = res.getHeader('set-cookie');
      const setCookie = raw === undefined ? [] : (Array.isArray(raw) ? raw : [String(raw)]).map(redactSetCookie);
      const wwwAuthenticate = res.getHeader('www-authenticate');
      entries.push({
        id: ++sequence,
        at: new Date().toISOString(),
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Date.now() - started,
        cookie: redactCookieHeader(req.headers.cookie),
        authorization: redactAuthorization(req.headers.authorization),
        setCookie,
        wwwAuthenticate: wwwAuthenticate === undefined ? undefined : String(wwwAuthenticate),
      });
      if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    });
    next();
  }
}
