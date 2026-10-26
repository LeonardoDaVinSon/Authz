// Only OIDC_ISSUER_URL and OIDC_CLIENT_ID are required; everything else has a local default.
export const REQUIRED_OIDC_SETTINGS = ['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID'] as const;

export interface OidcSettings {
  issuer: string;
  clientId: string;
  // Absent for a public client: PKCE alone protects the code exchange.
  clientSecret?: string;
  redirectUri: string;
  scope: string;
  // Where the browser lands after the callback, success or failure.
  returnTo: string;
  adminEmails: string[];
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function missingOidcSettings(): string[] {
  return REQUIRED_OIDC_SETTINGS.filter((name) => !env(name));
}

export function oidcSettings(): OidcSettings | null {
  if (missingOidcSettings().length > 0) return null;
  const frontend = (env('FRONTEND_ORIGIN') ?? 'http://localhost:5173').replace(/\/$/, '');
  return {
    issuer: env('OIDC_ISSUER_URL')!,
    clientId: env('OIDC_CLIENT_ID')!,
    clientSecret: env('OIDC_CLIENT_SECRET'),
    redirectUri: env('OIDC_REDIRECT_URI') ?? `http://localhost:${env('PORT') ?? '3000'}/oidc/callback`,
    scope: env('OIDC_SCOPES') ?? 'openid profile email',
    returnTo: env('OIDC_RETURN_TO') ?? `${frontend}/demo/oidc`,
    adminEmails: (env('OIDC_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  };
}

// Plain HTTP is only accepted for an IdP on this machine, for example Keycloak in Docker.
export function isLocalHttpIssuer(issuer: string): boolean {
  const url = new URL(issuer);
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
