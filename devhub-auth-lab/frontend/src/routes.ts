export type Tab = 'overview' | 'authz' | 'password' | 'session' | 'logout' | 'jwt' | 'tokens' | 'oidc';

// Slide hyperlinks point at these paths; keep them in sync with slides/deck-content.mjs.
export const ROUTES: Record<Tab, string> = {
  overview: '/demo',
  authz: '/demo/authz',
  password: '/demo/password',
  session: '/demo/session',
  logout: '/demo/session/logout-lab',
  jwt: '/demo/jwt',
  tokens: '/demo/tokens',
  oidc: '/demo/oidc',
};

export const TAB_ORDER: Tab[] = ['overview', 'authz', 'password', 'session', 'logout', 'jwt', 'tokens', 'oidc'];

export function tabFromPath(pathname: string): Tab {
  const path = pathname.replace(/\/+$/, '') || '/';
  const match = (Object.entries(ROUTES) as [Tab, string][]).find(([, route]) => route === path);
  return match ? match[0] : 'overview';
}
