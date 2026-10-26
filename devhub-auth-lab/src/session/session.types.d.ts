import 'express-session';
import type { DemoUser } from '../common/demo-users';
import type { OidcLoginSummary, OidcTransaction } from '../oidc/oidc.service';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    role?: string;
    visitedAt?: string;
    oidcTransaction?: OidcTransaction;
    oidcUser?: DemoUser;
    oidcLogin?: OidcLoginSummary;
  }
}
