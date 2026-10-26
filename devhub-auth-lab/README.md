# DevHub Auth Lab

A small **educational** NestJS + React lab for the *Break the Login — Authentication Core* sharing session. It backs the seven demos linked from the slide deck (`../slides/break-the-login.pptx`).

> **Safety and scope:** local teaching lab, not production authentication. Demo users only, development secret fallbacks, in-memory session and refresh-token stores, no rate limiting. The API binds to `127.0.0.1` by default. Do not expose it to the internet and never use real credentials or tokens.

## Requirements

- Node.js 20 or later, npm
- Docker (optional)

## Run

### Docker

```bash
docker compose up -d --build
```

- Demo UI: <http://localhost:5173/demo>
- API: <http://localhost:3000> (`/health` returns `200`)

Both ports bind to `127.0.0.1`. Compose reads values from `.env` when present, otherwise the local defaults in `docker-compose.yml`. `VITE_API_BASE_URL` is baked into the frontend at build time, so **rebuild after any code or URL change** (`--build`). Keep `SESSION_COOKIE_SECURE=false` unless you serve over HTTPS, otherwise the browser drops the session cookie. Stop with `docker compose down`.

### Development

```bash
# terminal 1 — API on :3000
cp .env.example .env
npm install
npm run start:dev

# terminal 2 — UI on :5173
cd frontend
cp .env.example .env
npm install
npm run dev
```

The API allows credentialed CORS only for `FRONTEND_ORIGIN` (default `http://localhost:5173`). To run on other ports, set `PORT` and `FRONTEND_ORIGIN` for the API and `VITE_API_BASE_URL` for the UI, then rebuild the deck with `DEMO_BASE_URL` (see `../slides`).

## Demo users

| Email | Role | Password |
|---|---|---|
| `member@devhub.local` | `member` | `DevHub-demo-pass-123!` |
| `admin@devhub.local` | `admin` | `DevHub-demo-pass-123!` |

These credentials are intentionally public and must never be reused. Unknown email and wrong password get the same `401` message and similar timing.

## Demos

The topbar shows **DEMO ONLY — LOCAL**, the API status, a **Reset demo** button (`POST /lab/reset`: clears sessions, refresh-token families and the inspector log) and a request inspector. The UI is in Vietnamese by default with an English toggle.

| # | Route | Slide | What it shows | Real or simulated |
|---|---|---|---|---|
| — | `/demo` | — | Navigation to every lab | — |
| 1 | `/demo/authz` | 4 | `GET /api/me` and `/api/admin` anonymous, as member and as admin: `401` / `403` / `200`; same rule with Bearer tokens | Real backend decisions |
| 2 | `/demo/password` | 6 | Hash the same password twice (different salts), verify right/wrong; leaked SHA-256 vs bcrypt table and offline wordlist crack | Real bcrypt; leak table is fake data |
| 3 | `/demo/session` | 8 | Session rotation on login, cookie with/without, `HttpOnly` check via `document.cookie`, cookie anatomy, replay of a stolen ID | Real sessions |
| 4 | `/demo/session/logout-lab` | 9 | Cookie-only logout vs server-side `session.destroy()`, then replay the copied ID | Real sessions; the broken logout is a deliberate lab mode |
| 5 | `/demo/jwt` | 13 | Decode vs verify, prepared fixtures (tampered role, `alg: none`, HS384, expired, wrong `iss`/`aud`, `nbf`), strict vs naive verifier trace, send the token to the real API | Real verification; fixtures are lab-signed tokens |
| 6 | `/demo/tokens` | 14 | Access + refresh login, refresh rotation, reuse detection revoking the family, logout | Real flow, in-memory store |
| 7 | `/demo/oidc` | 19 | Authorization Code + PKCE sequence, state mismatch, ID vs access token; with an IdP configured, a real login and the list of checks DevHub ran | **Live** once `OIDC_ISSUER_URL` and `OIDC_CLIENT_ID` are set (banner `LIVE OIDC — REAL IDENTITY PROVIDER`). Otherwise **`FLOW WALKTHROUGH — NO REAL LOGIN`**: PKCE values are computed in the browser, all IdP traffic is sample data |

The step-by-step presenter script with expected status codes is in [`../docs/03-demo-runbook.md`](../docs/03-demo-runbook.md).

## API

### DevHub API

| Endpoint | Purpose |
|---|---|
| `GET /api/me` | Current principal. Uses `Authorization: Bearer` if present (never falls back to the cookie), otherwise the session. `401` + `WWW-Authenticate` when unauthenticated |
| `GET /api/admin` | Same authentication, then requires role `admin` (read from the user record): `403` for members |
| `POST /session/login` | `{ email, password }` → regenerates the session ID, sets `devhub.sid` (`HttpOnly`, `SameSite=Lax`, 15 min) |
| `GET /session/me` | Session-only identity check |
| `POST /session/logout` | Destroys the server-side session, expires the cookie, `204` |
| `POST /password/hash-demo` | `{ password, cost }` → bcrypt hash and timing (cost 4–16) |
| `POST /password/verify-demo` | `{ password, hash }` → `{ match }` |
| `POST /tokens/login` | `{ email, password, shortLived? }` → access JWT (120 s, or 20 s) + opaque refresh token (30 min) |
| `POST /tokens/refresh` | `{ refreshToken }` → rotates; reusing a rotated token revokes the whole family |
| `POST /tokens/logout` | `{ refreshToken }` → revokes the family, `204` |
| `POST /jwt/issue-demo-token` | Demo token without authenticating a user (lab only) |
| `GET /jwt/me`, `GET /jwt/admin` | Bearer-only checks used by the JWT lab |
| `GET /oidc/status` | `mode: "walkthrough"` plus the missing keys, or `mode: "live"` with issuer, client id, redirect URI and whether discovery succeeded. Never returns the client secret |
| `GET /oidc/login` | Live mode only (`404` otherwise): stores `state`, `nonce` and the PKCE `code_verifier` in the session, `302` to the IdP |
| `GET /oidc/callback` | Single-use transaction (10 min). Checks `state`, exchanges the code with the verifier, validates the ID token (JWKS signature, `iss`, `aud`, `exp`, `nonce`), regenerates the session ID, then redirects to the UI with `?oidc=ok` or `?oidc=error&reason=…` |
| `GET /oidc/session` | Claims and checks of the current OIDC login; `401` without one. Raw tokens are never stored or returned |
| `POST /oidc/logout` | Destroys the DevHub session and returns the IdP `endSessionUrl` when the IdP supports RP-initiated logout |
| `GET /health` | Liveness |

### Lab instruments

These exist only to teach. They expose internal detail on purpose and must never ship in a real service.

| Endpoint | Purpose | Guard |
|---|---|---|
| `POST /lab/reset` | Clear sessions, refresh-token families, inspector | `DEMO_MODE` |
| `GET /lab/tokens` | Refresh-token families (status and a short token prefix, never the full token) | `DEMO_MODE` |
| `GET /lab/config` | Which lab modes are enabled | — |
| `GET /lab/jwt/fixtures`, `POST /lab/jwt/inspect` | Prepared JWTs; strict or naive verification trace | — |
| `GET /lab/password/leak`, `POST /lab/password/crack` | Fake leaked table and offline crack | — |
| `GET` / `DELETE /lab/inspector` | Recent request headers, credentials shortened | — |
| `GET /lab/session/inspect`, `POST /lab/session/visit` | Session ID and cookie attributes; persist an anonymous session | — |
| `POST /lab/session/replay` | Would this session ID alone authenticate? | `LAB_VULNERABLE_MODES` |
| `POST /lab/session/forget-cookie` | The broken logout: expire the cookie, keep the session | `LAB_VULNERABLE_MODES` |

The naive JWT verifier only explains a token; it never grants access to another endpoint. Session replay only reports whether an ID is live; it does not hand out a cookie. Set `LAB_VULNERABLE_MODES=false` to disable the deliberately broken modes and `DEMO_MODE=false` to disable reset and token-state endpoints.

### curl examples

```bash
# 401 → login → 200 → 403
curl -i http://localhost:3000/api/me
curl -s -c cookies.txt -X POST http://localhost:3000/session/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@devhub.local","password":"DevHub-demo-pass-123!"}'
curl -i -b cookies.txt http://localhost:3000/api/me
curl -i -b cookies.txt http://localhost:3000/api/admin

# logout, then the same cookie is rejected
curl -i -b cookies.txt -X POST http://localhost:3000/session/logout
curl -i -b cookies.txt http://localhost:3000/api/me
rm cookies.txt
```

## Scripts

```bash
npm test            # unit + e2e (Jest, supertest)
npm run lint        # tsc --noEmit
npm run build       # nest build
npm run lab:jwt     # tampering / alg:none walkthrough in the terminal
npm run lab:password  # bcrypt cost benchmark (cost 10, 11, 12)
```

E2E tests in `test/` cover `401`/`403` for session and Bearer, password hash/verify, session rotation and server-side revocation, JWT tampering/expiry/issuer/audience/algorithm, refresh rotation and reuse detection, OIDC (walkthrough fallback, and a full login against an in-process fake IdP including wrong `state`, replayed callback, wrong `nonce`, foreign signing key, wrong `aud` and IdP errors), and reset.

## Configuration

See [`.env.example`](.env.example). Never commit `.env`. Generate your own random `SESSION_SECRET` and `JWT_SECRET`; the fallbacks in code and compose are for local teaching only.

## Enable live OIDC (Demo 7)

Only two keys are required. Put them in `.env` (read by both `npm run start:dev` and `docker compose`):

```bash
OIDC_ISSUER_URL=https://your-idp.example.com/realms/devhub   # issuer, not the discovery URL
OIDC_CLIENT_ID=devhub-web
OIDC_CLIENT_SECRET=          # optional: empty for a public client (PKCE only)
```

At the Identity Provider, create an OIDC web application (Authorization Code flow) and register:

- Redirect URI: `http://localhost:3000/oidc/callback` (exactly; change it with `OIDC_REDIRECT_URI` if the API runs elsewhere)
- Post-logout redirect URI (optional, for "Sign out at the IdP"): `http://localhost:5173/demo/oidc`
- Scopes `openid profile email`

Restart the API (or `docker compose up -d --build`), open `/demo/oidc`: the banner turns into `LIVE OIDC — REAL IDENTITY PROVIDER` and **Sign in with Identity Provider** starts a real login. If discovery fails the banner says `OIDC CONFIGURED — IDENTITY PROVIDER UNREACHABLE` and the button is disabled. Add your email to `OIDC_ADMIN_EMAILS` to get `role=admin` and see `/api/admin` return `200`.

Issuer examples:

| IdP | `OIDC_ISSUER_URL` |
|---|---|
| Keycloak | `https://<host>/realms/<realm>` (local: `http://localhost:8080/realms/<realm>`) |
| Google | `https://accounts.google.com` |
| Microsoft Entra ID | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| Auth0 | `https://<tenant>.auth0.com/` (keep the trailing slash) |
| Okta | `https://<org>.okta.com/oauth2/default` |

Notes:

- Use a test tenant or test account, never a production client.
- The ID token must be signed with an asymmetric key from the IdP JWKS (RS256, ES256, …). HS256-signed ID tokens are rejected.
- The client secret is sent as `client_secret_post`. Plain `http://` issuers are only accepted on `localhost`.
- With Docker, `localhost` inside the API container is the container itself. A hosted IdP works as-is; for an IdP running on your machine, run the API with `npm run start:dev` instead.
- Without the two keys nothing changes: Demo 7 stays the labelled walkthrough.

## Limitations

- Session store (`MemoryStore`) and refresh-token store are in memory: lost on restart, single process only.
- No rate limiting, account lockout or MFA; the slides explain why they are needed instead of shipping an incomplete limiter.
- HS256 with a shared secret; no key rotation or JWKS.
- Access JWTs cannot be revoked before `exp` (no denylist); they are short-lived instead.
- No CSRF token: the session cookie relies on `SameSite=Lax` and JSON-only endpoints, which is enough for the lab but must be assessed for a real app.
- OIDC live mode uses `openid-client` with an in-memory login transaction; there is no token refresh, no back-channel logout and no userinfo call. Automated tests use a fake IdP; a real IdP has to be configured by you.
- `/jwt/issue-demo-token` and the `/lab/*` endpoints are teaching instruments.
