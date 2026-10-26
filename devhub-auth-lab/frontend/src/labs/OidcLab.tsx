import { useEffect, useState } from 'react';
import { API, ApiResult, encodeBase64Url, postJson, request } from '../api';
import type { Key, Translate } from '../i18n';
import { JsonPanel, LabHeading, Rich, Status } from '../ui';

const ACTORS = ['browser', 'client', 'idp', 'api'] as const;
type Actor = typeof ACTORS[number];
type Step = { from: Actor; to: Actor; sample: (p: Pkce) => string };
type Pkce = { verifier: string; challenge: string; state: string; nonce: string };

const IDP = 'https://idp.example.test';
const CLIENT = 'http://localhost:5173';

const STEPS: Step[] = [
  { from: 'browser', to: 'client', sample: (p) => `// DevHub client, before redirecting\ncode_verifier  = ${p.verifier}\ncode_challenge = BASE64URL(SHA256(code_verifier))\n               = ${p.challenge}\nstate          = ${p.state}\nnonce          = ${p.nonce}\n// stored server-side or in the session, never in the URL` },
  { from: 'client', to: 'idp', sample: (p) => `HTTP/1.1 302 Found\nLocation: ${IDP}/authorize\n  ?response_type=code\n  &client_id=devhub-web\n  &redirect_uri=${encodeURIComponent(`${CLIENT}/callback`)}\n  &scope=openid%20profile%20email\n  &state=${p.state}\n  &nonce=${p.nonce}\n  &code_challenge=${p.challenge}\n  &code_challenge_method=S256` },
  { from: 'browser', to: 'idp', sample: () => `// The password goes to the IdP only.\n// DevHub never sees it.\nPOST ${IDP}/login\nusername=member@devhub.local&password=••••••` },
  { from: 'idp', to: 'client', sample: (p) => `HTTP/1.1 302 Found\nLocation: ${CLIENT}/callback\n  ?code=SplxlOBeZQQYbYS6WxSbIA\n  &state=${p.state}` },
  { from: 'client', to: 'client', sample: (p) => `if (query.state !== session.oidcState) reject(400)\n// expected: ${p.state}\n// one-time use: delete session.oidcState` },
  { from: 'client', to: 'idp', sample: (p) => `POST ${IDP}/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=SplxlOBeZQQYbYS6WxSbIA\n&redirect_uri=${encodeURIComponent(`${CLIENT}/callback`)}\n&client_id=devhub-web\n&code_verifier=${p.verifier}` },
  { from: 'idp', to: 'client', sample: () => `HTTP/1.1 200 OK\n{\n  "token_type": "Bearer",\n  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.<sample>.<sig>",\n  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.<sample>.<sig>",\n  "expires_in": 300\n}` },
  { from: 'client', to: 'client', sample: (p) => `verify(id_token, jwks_from("${IDP}/.well-known/jwks.json"))\nassert iss   === "${IDP}"\nassert aud   includes "devhub-web"\nassert exp   > now\nassert nonce === "${p.nonce}"\n// then create DevHub's own session` },
  { from: 'client', to: 'api', sample: () => `GET /api/projects\nAuthorization: Bearer <access_token>\n// API checks: signature, iss, aud === "devhub-api", exp, scope` },
];

const ID_TOKEN = { iss: IDP, sub: 'idp|8f2c', aud: 'devhub-web', exp: 1760000300, iat: 1760000000, nonce: '<nonce from step 1>', email: 'member@devhub.local', name: 'Mai Member' };
const ACCESS_TOKEN = { iss: IDP, sub: 'idp|8f2c', aud: 'devhub-api', exp: 1760000300, scope: 'projects:read', client_id: 'devhub-web' };

function randomString(bytes = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function createPkce(): Promise<Pkce> {
  const verifier = randomString(32);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge: encodeBase64Url(digest), state: randomString(16), nonce: randomString(16) };
}

type OidcStatus =
  | { mode: 'walkthrough'; configured: false; missing: string[] }
  | { mode: 'live'; configured: true; issuer: string; clientId: string; clientType: string; redirectUri: string; scope: string; discovery: { ok: boolean }; banner: string };

type OidcLogin = {
  user: { name: string; email: string; role: string };
  idToken: { alg: string; kid: string | null; claims: Record<string, unknown> };
  accessToken: Record<string, unknown>;
  refreshTokenIssued: boolean;
  checks: { id: 'state' | 'pkce' | 'signature' | 'iss' | 'aud' | 'exp' | 'nonce'; detail: string; value?: string }[];
};

// The callback redirects back here with ?oidc=ok or ?oidc=error&reason=…
function readCallbackResult() {
  const params = new URLSearchParams(window.location.search);
  const outcome = params.get('oidc');
  if (!outcome) return null;
  return { ok: outcome === 'ok', reason: params.get('reason') ?? '', detail: params.get('detail') ?? '' };
}

function shortKid(kid: string | null) {
  if (!kid) return '—';
  return kid.length > 14 ? `${kid.slice(0, 12)}…` : kid;
}

function LiveOidc({ t, status }: { t: Translate; status: Extract<OidcStatus, { mode: 'live' }> }) {
  const [callback] = useState(readCallbackResult);
  const [login, setLogin] = useState<OidcLogin | null>(null);
  const [me, setMe] = useState<ApiResult | null>(null);
  const [endSessionUrl, setEndSessionUrl] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    request('/oidc/session').then((result) => setLogin(result.ok ? result.body : null));
  }, []);

  const logout = async () => {
    const result = await postJson('/oidc/logout');
    setEndSessionUrl(result.ok ? result.body.endSessionUrl : null);
    setLogin(null); setMe(null); setLoggedOut(true);
  };

  return <>
    <div className={`flow-banner ${status.discovery.ok ? 'real' : 'walkthrough'}`}>{status.banner}<small>{status.discovery.ok ? t('oidc.liveSub', { issuer: status.issuer }) : t('oidc.unreachableSub', { issuer: status.issuer })}</small></div>
    <div className="two-column">
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('oidc.liveKicker')}</span><h3>{t('oidc.liveTitle')}</h3></div><span className="mini-badge">GET /oidc/login</span></div>
        <dl className="oidc-config">
          <dt>issuer</dt><dd>{status.issuer}</dd>
          <dt>client_id</dt><dd>{status.clientId} · {status.clientType}</dd>
          <dt>redirect_uri</dt><dd>{status.redirectUri}</dd>
          <dt>scope</dt><dd>{status.scope}</dd>
        </dl>
        <p className="hint">{t('oidc.registerHint')}</p>
        <button className="button primary full" disabled={!status.discovery.ok} onClick={() => { window.location.href = `${API}/oidc/login`; }}>{t('oidc.signIn')} <span>↗</span></button>
        {callback && (callback.ok
          ? <div className="verdict good">{t('oidc.resultOk')}</div>
          : <div className="verdict bad">{t('oidc.resultError', { reason: t(`oidc.reason.${callback.reason}` as Key, { detail: callback.detail || '—' }) })}<span className="verdict-code">reason = {callback.reason}</span></div>)}
        {loggedOut && <div className="verdict good">{t('oidc.loggedOut')}{endSessionUrl && <> <a href={endSessionUrl}>{t('oidc.logoutIdp')} ↗</a></>}</div>}
      </section>
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('oidc.validatedKicker')}</span><h3>{login ? t('oidc.signedInAs', { name: login.user.name, role: login.user.role }) : t('oidc.noLogin')}</h3></div>{login && <span className="mini-badge">{login.user.email}</span>}</div>
        {login && <>
          <ul className="oidc-checks">{login.checks.map((check) => <li key={check.id}><span className="pill good">✓ {check.id}</span><small>{t(`oidc.check.${check.id}`, { value: check.value ?? '' })}</small></li>)}</ul>
          <div className="button-row"><button className="button secondary" onClick={async () => setMe(await request('/api/me'))}>{t('oidc.callMe')}</button><button className="button danger" onClick={logout}>{t('oidc.logoutLocal')}</button></div>
          {me && <div className="result-block"><div className="result-title"><span>GET /api/me</span><Status result={me} t={t} /></div><JsonPanel value={me.body} /></div>}
        </>}
      </section>
    </div>
    {login && <div className="two-column">
      <section className="panel"><div className="panel-header"><div><span className="panel-kicker">ID TOKEN · {login.idToken.alg}</span><h3>{t('oidc.idTokenTitle')}</h3></div><span className="mini-badge" title={login.idToken.kid ?? undefined}>kid = {shortKid(login.idToken.kid)}</span></div><JsonPanel value={login.idToken.claims} /></section>
      <section className="panel"><div className="panel-header"><div><span className="panel-kicker">ACCESS TOKEN</span><h3>{t('oidc.accessTitle')}</h3></div></div><JsonPanel value={{ ...login.accessToken, refreshTokenIssued: login.refreshTokenIssued }} /></section>
    </div>}
  </>;
}

export function OidcLab({ t }: { t: Translate }) {
  const [status, setStatus] = useState<OidcStatus | null>(null);
  const [pkce, setPkce] = useState<Pkce | null>(null);
  const [current, setCurrent] = useState(0);
  const [tamperState, setTamperState] = useState(false);

  useEffect(() => {
    request('/oidc/status').then((result) => { if (result.ok) setStatus(result.body); });
    createPkce().then(setPkce);
  }, []);

  const step = STEPS[current];
  const column = (actor: Actor) => ACTORS.indexOf(actor);
  const live = status?.mode === 'live' ? status : null;

  return <>
    <LabHeading eyebrow={t('oidc.eyebrow')} title="OIDC" accent={t('oidc.titleAccent')} lead={live ? t('oidc.leadLive') : t('oidc.lead')} symbol="⇆" tone="purple" />
    {live
      ? <><LiveOidc t={t} status={live} /><div className="section-heading"><div><div className="eyebrow muted">{t('oidc.seqKicker')}</div><h2>Authorization Code Flow + PKCE</h2></div><span className="small-note">{t('oidc.sampleNote')}</span></div></>
      : <div className="flow-banner walkthrough">FLOW WALKTHROUGH — NO REAL LOGIN<small>{t('oidc.bannerSub')}{status && !status.configured ? ` ${t('oidc.missing', { vars: status.missing.join(', ') })} ${t('oidc.enableHint')}` : ''}</small></div>}

    <section className="panel">
      <div className="panel-header"><div><span className="panel-kicker">{t('oidc.paramsKicker')}</span><h3>{t('oidc.paramsTitle')}</h3></div></div>
      <div className="param-grid">{(['state', 'nonce', 'pkce', 'redirect', 'code'] as const).map((id) => (
        <div key={id} className="param-card">
          <strong>{t(`oidc.param.${id}.name` as Key)}</strong>
          <p>{t(`oidc.param.${id}.why` as Key)}</p>
        </div>
      ))}</div>
    </section>

    <section className="panel">
      <div className="panel-header"><div><span className="panel-kicker">{t('oidc.seqKicker')}</span><h3>Authorization Code Flow + PKCE</h3></div><div className="button-row"><button className="button secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← {t('oidc.prev')}</button><button className="button primary" disabled={current === STEPS.length - 1} onClick={() => setCurrent(current + 1)}>{t('oidc.next')} →</button></div></div>
      <div className="seq">
        <div className="seq-row seq-actors">{ACTORS.map((actor) => <div key={actor} className="seq-actor">{t(`oidc.actor.${actor}` as Key)}</div>)}</div>
        {STEPS.map((item, index) => {
          const a = column(item.from); const b = column(item.to);
          const self = a === b;
          const left = Math.min(a, b); const span = Math.abs(a - b);
          return <button key={index} className={`seq-row seq-step ${index === current ? 'current' : ''} ${index > current ? 'future' : ''}`} onClick={() => setCurrent(index)}>
            {ACTORS.map((actor, column) => <span key={actor} className="seq-lifeline" style={{ gridColumn: column + 1 }} />)}
            <span className={`seq-arrow ${self ? 'self' : b > a ? 'right' : 'left'}`} style={self ? { gridColumn: `${a + 1} / span 1` } : { gridColumn: `${left + 1} / span ${span + 1}`, marginInline: `calc(100% / ${2 * (span + 1)})` }}>
              <em>{index + 1}. {t(`oidc.s${index + 1}.title` as Key)}</em>
            </span>
          </button>;
        })}
      </div>
    </section>

    <div className="two-column oidc-detail">
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('oidc.stepOf', { n: current + 1, total: STEPS.length })}</span><h3>{t(`oidc.s${current + 1}.title` as Key)}</h3></div><span className="mini-badge">{t(`oidc.actor.${step.from}` as Key)} → {t(`oidc.actor.${step.to}` as Key)}</span></div>
        <p className="panel-description"><Rich text={t(`oidc.s${current + 1}.desc` as Key)} /></p>
        {current === 0 && <button className="button secondary" onClick={() => createPkce().then(setPkce)}>{t('oidc.regenerate')}</button>}
        {current === 4 && <div className="state-check">
          <label className="check-row"><input type="checkbox" checked={tamperState} onChange={(e) => setTamperState(e.target.checked)} /> {t('oidc.tamperState')}</label>
          {tamperState ? <div className="verdict bad">{t('oidc.stateRejected')}</div> : <div className="verdict good">{t('oidc.stateAccepted')}</div>}
        </div>}
      </section>
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{current === 0 ? t('oidc.computed') : t('oidc.sample')}</span><h3>{current === 0 ? 'PKCE · state · nonce' : 'HTTP'}</h3></div><span className={`pill ${current === 0 ? 'good' : 'neutral'}`}>{current === 0 ? t('oidc.realCrypto') : 'SAMPLE'}</span></div>
        <pre className="json-panel http-sample">{pkce ? step.sample(pkce) : t('common.loading')}</pre>
      </section>
    </div>

    <div className="section-heading"><div><div className="eyebrow muted">{t('oidc.tokensKicker')}</div><h2>ID token ≠ Access token</h2></div><span className="small-note">SAMPLE PAYLOADS</span></div>
    <div className="two-column">
      <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('oidc.idFor')}</span><h3>ID token</h3></div><span className="mini-badge">aud = devhub-web</span></div><JsonPanel value={ID_TOKEN} /><p className="hint">{t('oidc.idHint')}</p></section>
      <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('oidc.accessFor')}</span><h3>Access token</h3></div><span className="mini-badge">aud = devhub-api</span></div><JsonPanel value={ACCESS_TOKEN} /><p className="hint">{t('oidc.accessHint')}</p></section>
    </div>
    <div className="callout"><span className="callout-icon">i</span><div><strong>{t('oidc.takeawayTitle')}</strong><p><Rich text={t('oidc.takeawayBody')} /></p></div></div>
  </>;
}
