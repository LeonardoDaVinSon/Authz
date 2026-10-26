export type ApiResult = { ok: boolean; status: number; body: any; wwwAuthenticate?: string | null };

export const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const requestListeners = new Set<() => void>();

export async function request(path: string, options: RequestInit = {}): Promise<ApiResult> {
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      credentials: options.credentials || 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { ok: response.ok, status: response.status, body, wwwAuthenticate: response.headers.get('WWW-Authenticate') };
  } catch (error) {
    return { ok: false, status: 0, body: { message: error instanceof Error ? error.message : 'Network error' } };
  } finally {
    if (!path.startsWith('/lab/inspector')) requestListeners.forEach((listener) => listener());
  }
}

export const postJson = (path: string, body?: unknown, options: RequestInit = {}) =>
  request(path, { ...options, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const withBearer = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` }, credentials: 'omit' });

export function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try { return JSON.parse(decodeBase64Url(token.split('.')[1])); } catch { return null; }
}

export function shorten(value?: string | null, head = 10, tail = 4) {
  if (!value) return '—';
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
