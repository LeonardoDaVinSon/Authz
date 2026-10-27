// Extra OAuth scopes the live login UI may add on top of openid/profile/email.
// Keys are stable UI ids; values are the scope strings sent to the IdP.

export interface OidcExtraScope {
  id: string;
  scope: string;
  // Resource API this scope unlocks (teaching label).
  resource: string;
  googleOnly: boolean;
}

export const OIDC_EXTRA_SCOPES: OidcExtraScope[] = [
  {
    id: 'drive.readonly',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    resource: 'Google Drive API · read files',
    googleOnly: true,
  },
  {
    id: 'drive.metadata.readonly',
    scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
    resource: 'Google Drive API · read metadata only',
    googleOnly: true,
  },
];

const BY_ID = new Map(OIDC_EXTRA_SCOPES.map((item) => [item.id, item]));

export function isGoogleIssuer(issuer: string): boolean {
  try {
    const host = new URL(issuer).hostname;
    return host === 'accounts.google.com' || host.endsWith('.google.com');
  } catch {
    return false;
  }
}

export function availableExtraScopes(issuer: string): OidcExtraScope[] {
  const google = isGoogleIssuer(issuer);
  return OIDC_EXTRA_SCOPES.filter((item) => !item.googleOnly || google);
}

// Resolves ?extra=drive.readonly,drive.metadata.readonly into IdP scope strings (allowlist only).
export function resolveExtraScopes(raw: unknown, issuer: string): { ids: string[]; scopes: string[] } {
  const allowed = new Set(availableExtraScopes(issuer).map((item) => item.id));
  const parts = String(raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const ids = [...new Set(parts.filter((id) => allowed.has(id)))];
  return { ids, scopes: ids.map((id) => BY_ID.get(id)!.scope) };
}

export function mergeScopes(base: string, extras: string[]): string {
  const parts = [...base.split(/\s+/).filter(Boolean), ...extras];
  return [...new Set(parts)].join(' ');
}
