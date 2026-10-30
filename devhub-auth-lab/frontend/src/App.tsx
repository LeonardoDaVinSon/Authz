import { Fragment, useEffect, useMemo, useState } from 'react';
import { ApiResult, decodeBase64Url, encodeBase64Url, postJson, request, requestListeners } from './api';
import { Key, LANGS, Lang, Translate, loadLang, localeOf, makeTranslator, saveLang, translateTraceDetail } from './i18n';
import { AuthzLab } from './labs/AuthzLab';
import { JwtApiPanel } from './labs/JwtApiPanel';
import { LogoutLab } from './labs/LogoutLab';
import { OidcLab } from './labs/OidcLab';
import { PasswordVerifyPanel } from './labs/PasswordVerifyPanel';
import { TokensLab } from './labs/TokensLab';
import { ROUTES, TAB_ORDER, Tab, tabFromPath } from './routes';
import { JsonPanel, Rich, Status, messageOf } from './ui';

type VerifierMode = 'strict' | 'naive';
type Step = { id: string; label: string; state: 'pass' | 'fail' | 'skipped' | 'not-reached'; detail: string };
type Inspection = { mode: VerifierMode; accepted: boolean; httpStatus: number; publicResponse: unknown; steps: Step[] };
type Fixture = { id: string; label: string; description: string; failsAt: string | null; token: string };
type InspectorEntry = { id: number; at: string; method: string; path: string; status: number; durationMs: number; cookie?: string; authorization?: string; setCookie: string[]; wwwAuthenticate?: string };

const LAB_META: Record<Exclude<Tab, 'overview'>, { icon: string; tone: 'purple' | 'green' | 'orange'; slide: number; demo: number }> = {
  authz: { icon: '⊘', tone: 'purple', slide: 5, demo: 1 },
  password: { icon: '⟡', tone: 'orange', slide: 9, demo: 2 },
  session: { icon: '◉', tone: 'purple', slide: 12, demo: 3 },
  logout: { icon: '⏻', tone: 'orange', slide: 13, demo: 4 },
  jwt: { icon: '⌘', tone: 'green', slide: 18, demo: 5 },
  tokens: { icon: '⟳', tone: 'green', slide: 19, demo: 6 },
  oidc: { icon: '⇆', tone: 'purple', slide: 25, demo: 7 },
};

type CookieRow = { name: string; value: string; state: 'good' | 'warn'; does: string; doesNot: string };
function cookieRows(cookie: any, t: Translate): CookieRow[] {
  const minutes = cookie.maxAgeMs ? Math.round(cookie.maxAgeMs / 60000) : null;
  const row = (name: string, key: string, value: string, good: boolean): CookieRow => ({
    name, value, state: good ? 'good' : 'warn', does: t(`cookie.${key}.does` as Key), doesNot: t(`cookie.${key}.doesNot` as Key),
  });
  return [
    row('HttpOnly', 'httpOnly', String(cookie.httpOnly), Boolean(cookie.httpOnly)),
    row('Secure', 'secure', String(cookie.secure), Boolean(cookie.secure)),
    row('SameSite', 'sameSite', String(cookie.sameSite), Boolean(cookie.sameSite) && cookie.sameSite !== 'none'),
    row('Path', 'path', String(cookie.path), true),
    row('Max-Age', 'maxAge', minutes ? `${minutes} ${t('unit.min')}` : t('cookie.sessionOnly'), Boolean(minutes)),
    row('Domain', 'domain', t('cookie.notSet'), true),
  ];
}

function shortId(id?: string | null) {
  return id ? `${id.slice(0, 10)}…${id.slice(-4)}` : '—';
}

function formatDuration(seconds: number, t: Translate) {
  if (seconds < 60) return `${seconds} ${t('unit.s')}`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} ${t('unit.min')}`;
  if (seconds < 86400 * 2) return `${Math.round(seconds / 3600)} ${t('unit.h')}`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / 86400)} ${t('unit.days')}`;
  return `${(seconds / 86400 / 365).toFixed(1)} ${t('unit.years')}`;
}

const STEP_ICON: Record<Step['state'], string> = { pass: '✓', fail: '✕', skipped: '–', 'not-reached': '·' };
function makeUnsignedToken(header: object, payload: object) {
  return `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}.`;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const { t, tx } = useMemo(() => makeTranslator(lang), [lang]);
  const locale = localeOf(lang);
  const [tab, setTabState] = useState<Tab>(() => tabFromPath(window.location.pathname));
  const [resetKey, setResetKey] = useState(0);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sessionResult, setSessionResult] = useState<ApiResult | null>(null);
  const [sessionLogin, setSessionLogin] = useState<ApiResult | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [sessionInspect, setSessionInspect] = useState<any>(null);
  const [anonId, setAnonId] = useState<string | null>(null);
  const [ghostId, setGhostId] = useState<string | null>(null);
  const [replayResult, setReplayResult] = useState<any>(null);
  const [noCookieResult, setNoCookieResult] = useState<ApiResult | null>(null);
  const [documentCookie, setDocumentCookie] = useState<string | null>(null);
  const [username, setUsername] = useState('member@devhub.local');
  const [password, setPassword] = useState('DevHub-demo-pass-123!');
  const [token, setToken] = useState('');
  const [jwtResult, setJwtResult] = useState<ApiResult | null>(null);
  const [hashPassword, setHashPassword] = useState('correct-horse-battery');
  const [cost, setCost] = useState(10);
  const [hashResult, setHashResult] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [notice, setNotice] = useState('');
  const [verifierMode, setVerifierMode] = useState<VerifierMode>('strict');
  const [vulnerableModes, setVulnerableModes] = useState(true);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeFixture, setActiveFixture] = useState<string | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [leak, setLeak] = useState<any[] | null>(null);
  const [crack, setCrack] = useState<any>(null);
  const [cracking, setCracking] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorEntries, setInspectorEntries] = useState<InspectorEntry[]>([]);

  useEffect(() => { saveLang(lang); }, [lang]);

  function setTab(next: Tab) {
    setTabState(next);
    if (window.location.pathname !== ROUTES[next]) window.history.pushState(null, '', ROUTES[next]);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const onPop = () => setTabState(tabFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    request('/health').then((result) => setApiStatus(result.ok ? 'online' : 'offline'));
    request('/lab/config').then((result) => { if (result.ok) setVulnerableModes(Boolean(result.body?.vulnerableModes)); });
  }, []);

  useEffect(() => {
    const refresh = () => { request('/lab/inspector').then((result) => { if (result.ok) setInspectorEntries(result.body); }); };
    refresh();
    requestListeners.add(refresh);
    return () => { requestListeners.delete(refresh); };
  }, []);

  async function loadFixtures() {
    const result = await request('/lab/jwt/fixtures');
    if (result.ok) setFixtures(result.body);
    return result.ok ? (result.body as Fixture[]) : [];
  }
  useEffect(() => { if (tab === 'jwt' && fixtures.length === 0) loadFixtures(); }, [tab]);
  useEffect(() => { if (tab === 'session') inspectSession(); }, [tab, resetKey]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const tokenParts = useMemo(() => {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1]) return null;
    try { return { header: JSON.parse(decodeBase64Url(parts[0])), payload: JSON.parse(decodeBase64Url(parts[1])), signature: parts[2] }; }
    catch { return null; }
  }, [token]);

  const fixtureLabel = (fixture: Fixture) => tx(`fixture.${fixture.id}.label`, fixture.label);
  const fixtureDescription = (fixture: Fixture) => tx(`fixture.${fixture.id}.desc`, fixture.description);

  async function resetDemo() {
    const result = await postJson('/lab/reset');
    setSessionResult(null); setSessionLogin(null); setSessionUser(null); setSessionInspect(null);
    setAnonId(null); setGhostId(null); setReplayResult(null); setNoCookieResult(null); setDocumentCookie(null);
    setToken(''); setJwtResult(null); setInspection(null); setActiveFixture(null);
    setHashResult(null); setLeak(null); setCrack(null);
    setInspectorEntries([]);
    setResetKey((key) => key + 1);
    setNotice(result.ok ? t('reset.done') : messageOf(result, t));
  }

  async function inspectSession() {
    const result = await request('/lab/session/inspect');
    if (!result.ok) return null;
    setSessionInspect(result.body);
    if (result.body.authenticated) setGhostId(result.body.sessionId);
    return result.body;
  }
  async function visitAnonymously() {
    const result = await request('/lab/session/visit', { method: 'POST' });
    if (!result.ok) { setNotice(messageOf(result, t)); return; }
    setAnonId(result.body.sessionId); setReplayResult(null);
    setNotice(t('session.notice.visited'));
  }
  async function loginSession() {
    setBusy(true); setNotice('');
    const result = await postJson('/session/login', { email: username, password });
    setSessionLogin(result); setSessionUser(result.ok ? result.body : null);
    if (result.ok) { setReplayResult(null); await inspectSession(); }
    setNotice(result.ok ? t('session.notice.loggedIn') : messageOf(result, t));
    setBusy(false);
  }
  async function checkSession() {
    const result = await request('/api/me');
    setSessionResult(result); setSessionUser(result.ok ? result.body : null);
  }
  async function checkWithoutCookie() {
    setNoCookieResult(await request('/api/me', { credentials: 'omit' }));
  }
  function readDocumentCookie() {
    setDocumentCookie(document.cookie);
  }
  async function logoutSession() {
    const result = await request('/session/logout', { method: 'POST' });
    setSessionResult(result); setSessionUser(null); setReplayResult(null);
    await inspectSession();
    setNotice(result.ok ? t('session.notice.loggedOut') : messageOf(result, t));
  }
  async function replayGhost() {
    if (!ghostId) return;
    const result = await postJson('/lab/session/replay', { sessionId: ghostId });
    if (!result.ok) { setNotice(messageOf(result, t)); return; }
    setReplayResult(result.body);
  }
  async function issueToken(role: 'member' | 'admin' = 'member') {
    setBusy(true); setNotice('');
    const result = await postJson('/jwt/issue-demo-token', { role });
    if (result.ok) { setToken(result.body.accessToken); setActiveFixture(null); resetVerification(); }
    setNotice(result.ok ? t('jwt.notice.issued') : messageOf(result, t));
    setBusy(false);
  }
  function resetVerification() { setJwtResult(null); setInspection(null); }
  async function verifyToken(value = token, mode = verifierMode) {
    const result = await postJson('/lab/jwt/inspect', { token: value, mode });
    setJwtResult(result);
    setInspection(result.ok ? result.body : null);
  }
  function chooseMode(mode: VerifierMode) {
    setVerifierMode(mode);
    if (token) verifyToken(token, mode);
  }
  function pickFixture(fixture: Fixture) {
    setToken(fixture.token); setActiveFixture(fixture.id); resetVerification();
    setNotice(t('jwt.notice.loaded', { label: fixtureLabel(fixture), description: fixtureDescription(fixture) }));
  }
  function tamperPayload() {
    if (!tokenParts) { setNotice(t('jwt.notice.needToken')); return; }
    const changed = { ...tokenParts.payload, role: 'admin' };
    setToken(`${token.split('.')[0]}.${encodeBase64Url(JSON.stringify(changed))}.${tokenParts.signature}`);
    setActiveFixture(null); resetVerification(); setNotice(t('jwt.notice.tampered'));
  }
  function createAlgNoneToken() {
    const payload = tokenParts?.payload || { sub: 'user-123', email: 'member@devhub.local', role: 'admin', iss: 'devhub-auth-lab', aud: 'devhub-api', exp: Math.floor(Date.now() / 1000) + 300 };
    setToken(makeUnsignedToken({ alg: 'none', typ: 'JWT' }, { ...payload, role: 'admin' }));
    setActiveFixture(null); resetVerification(); setNotice(t('jwt.notice.algNone'));
  }
  async function hashDemo() {
    setBusy(true); setHashing(true);
    const result = await postJson('/password/hash-demo', { password: hashPassword, cost });
    setHashResult(result); setBusy(false); setHashing(false);
  }

  async function loadLeak() {
    setBusy(true);
    const result = await request('/lab/password/leak');
    setLeak(result.ok ? result.body : null); setCrack(null); setBusy(false);
    if (!result.ok) setNotice(messageOf(result, t));
  }
  async function runCrack() {
    setCracking(true);
    const result = await request('/lab/password/crack', { method: 'POST' });
    setCrack(result.ok ? result.body : null); setCracking(false);
    if (!result.ok) setNotice(messageOf(result, t));
  }

  async function clearInspector() {
    await request('/lab/inspector', { method: 'DELETE' });
    setInspectorEntries([]);
  }

  const crackedBy = (algorithm: 'sha256' | 'bcrypt', name: string) => crack?.[algorithm]?.cracked?.find((hit: any) => hit.username === name);
  const naiveAcceptedAdmin = inspection?.mode === 'naive' && inspection.accepted && (inspection.publicResponse as any)?.role === 'admin';
  const step = (n: string) => t('common.step', { n });
  const navLabel = (id: Tab) => t(`nav.${id}.label` as Key);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">D</div><div><div className="brand-name">DevHub</div><div className="brand-sub">AUTH LAB / LOCAL</div></div></div>
      <div className="side-label">{t('sidebar.playground')}</div>
      <nav>{TAB_ORDER.map((id, index) => <a key={id} href={ROUTES[id]} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={(event) => { event.preventDefault(); setTab(id); }}><span className="nav-number">{String(index).padStart(2, '0')}</span><span className="nav-copy"><strong>{navLabel(id)}</strong><small>{t(`nav.${id}.desc` as Key)}</small></span>{tab === id && <span className="nav-dot" />}</a>)}</nav>
      <div className="sidebar-bottom"><div className="safe-icon">⌁</div><div><strong>{t('sidebar.safeTitle')}</strong><p>{t('sidebar.safeBody')}</p></div></div>
      <div className="sidebar-footer">BREAK THE LOGIN <span>·</span> AUTHENTICATION CORE</div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">{t('topbar.lab')} <span>/</span> <strong>{navLabel(tab).toLocaleUpperCase(locale)}</strong>{tab !== 'overview' && <span className="slide-ref">{t('topbar.slideRef', { slide: LAB_META[tab].slide, demo: LAB_META[tab].demo })}</span>}</div><div className="topbar-right">
        <span className="demo-only">DEMO ONLY — LOCAL</span>
        <button className="reset-button" onClick={resetDemo} title={t('reset.title')}>↺ {t('reset.label')}</button>
        <div className="lang-switch" role="group" aria-label={t('topbar.language')}>{LANGS.map((code) => <button key={code} className={lang === code ? 'active' : ''} aria-pressed={lang === code} onClick={() => setLang(code)}>{code.toUpperCase()}</button>)}</div>
        <button className={`inspector-toggle ${inspectorOpen ? 'active' : ''}`} onClick={() => setInspectorOpen((open) => !open)}>⇄ {t('topbar.inspector')} <b>{inspectorEntries.length}</b></button><span className={`status-dot ${apiStatus}`} />API {t(`topbar.${apiStatus}` as Key)}</div></header>
      <div className="content-wrap">
        <div className="eyebrow"><span className="eyebrow-line" /> {t('eyebrow.core')} <span className="eyebrow-chip">{t('eyebrow.handsOn')}</span></div>
        {tab === 'overview' && <>
          <section className="hero"><div className="hero-copy"><div className="hero-kicker">{t('overview.kicker')}</div><h1>Break the <span>Login.</span></h1><p>{t('overview.lead')}</p><div className="hero-actions"><button className="button primary" onClick={() => setTab('authz')}>{t('overview.start')} <span>↗</span></button><button className="button secondary" onClick={() => setTab('session')}>{t('overview.exploreSessions')}</button></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="lock-core"><div className="lock-shackle"/><div className="lock-body"><span/></div></div><div className="art-tag tag-verify">{t('overview.tagVerify')}</div><div className="art-tag tag-token">{t('overview.tagToken')}</div><div className="art-tag tag-trust">{t('overview.tagTrust')}</div></div></section>
          <div className="section-heading"><div><div className="eyebrow muted">{t('overview.chooseLab')}</div><h2>{t('overview.heading')}</h2></div><span className="small-note">{t('overview.modules')}</span></div>
          <div className="module-grid">{(Object.keys(LAB_META) as (keyof typeof LAB_META)[]).map((id) => <a key={id} href={ROUTES[id]} className="module-card" onClick={(event) => { event.preventDefault(); setTab(id); }}>
            <div className="module-top"><span className={`module-icon ${LAB_META[id].tone}`}>{LAB_META[id].icon}</span><span className="module-number">DEMO {LAB_META[id].demo} · SLIDE {LAB_META[id].slide}</span></div>
            <h3>{navLabel(id)}</h3><p>{t(`overview.card.${id}.desc` as Key)}</p>
            <div className="module-bottom"><span className="mono">{ROUTES[id]}</span><b>↗</b></div></a>)}</div>
          <section className="concept-strip"><div><span className="strip-index">01</span><strong>{t('overview.strip1.title')}</strong><p>{t('overview.strip1.desc')}</p></div><div><span className="strip-index">02</span><strong>{t('overview.strip2.title')}</strong><p>{t('overview.strip2.desc')}</p></div><div><span className="strip-index">03</span><strong>{t('overview.strip3.title')}</strong><p>{t('overview.strip3.desc')}</p></div></section>
        </>}
        {tab === 'authz' && <AuthzLab key={resetKey} t={t} />}
        {tab === 'logout' && <LogoutLab key={resetKey} t={t} vulnerableModes={vulnerableModes} />}
        {tab === 'tokens' && <TokensLab key={resetKey} t={t} />}
        {tab === 'oidc' && <OidcLab key={resetKey} t={t} />}
        {tab === 'session' && <>
          <section className="page-heading"><div><div className="eyebrow muted">{t('session.eyebrow')}</div><h1>Session <span>& Cookie.</span></h1><p>{t('session.lead')}</p></div><div className="heading-symbol purple">◉</div></section>
          <div className="two-column"><section className="panel"><div className="panel-header"><div><span className="panel-kicker">{step('01')}</span><h3>{t('session.step1.title')}</h3></div><span className="mini-badge">POST /session/login</span></div><p className="panel-description">{t('session.step1.desc')}</p><button className="button secondary full" onClick={visitAnonymously}>{t('session.visitAnon')} <span>↺</span></button>{anonId && <div className="hint">{t('session.preLoginId')} <code>{shortId(anonId)}</code></div>}<label>{t('session.username')}</label><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off"/><label>{t('session.password')}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off"/><div className="hint">{t('session.credsHint')}</div><button className="button primary full" disabled={busy} onClick={loginSession}>{busy ? t('session.working') : t('session.login')} <span>→</span></button>{sessionLogin && <div className="result-block"><div className="result-title"><span>{t('session.loginResponse')}</span><Status result={sessionLogin} t={t}/></div><JsonPanel value={sessionLogin.body}/></div>}</section>
          <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{step('02')}</span><h3>{t('session.step2.title')}</h3></div><span className="mini-badge">GET /api/me</span></div><p className="panel-description">{t('session.step2.desc')}</p><div className={`session-state ${sessionUser ? 'signed-in' : ''}`}><div className="avatar">{sessionUser ? sessionUser.name?.[0] ?? '?' : '?'}</div><div><strong>{sessionUser?.email || t('session.noUser')}</strong><small>{sessionUser ? t('session.userId', { id: `${sessionUser.id} · role = ${sessionUser.role}` }) : t('session.checkAfterLogin')}</small></div><span className={`state-tag ${sessionUser ? 'good' : 'neutral'}`}>{sessionUser ? t('session.authenticated') : t('session.unknown')}</span></div><div className="button-row"><button className="button secondary" onClick={checkSession}>{t('session.checkWith')}</button><button className="button secondary" onClick={checkWithoutCookie}>{t('session.checkWithout')}</button><button className="button danger" onClick={logoutSession}>{t('session.logout')}</button></div>{sessionResult && <div className="result-block"><div className="result-title"><span>{t('session.sessionCheck')}</span><Status result={sessionResult} t={t}/></div><JsonPanel value={sessionResult.body || { message: t('session.noBody') }}/></div>}{noCookieResult && <div className="result-block"><div className="result-title"><span>{t('session.noCookieTitle')}</span><Status result={noCookieResult} t={t}/></div><JsonPanel value={noCookieResult.body}/><p className="hint">{t('session.noCookieHint')}</p></div>}</section></div>
          <section className="panel cookie-panel"><div className="panel-header"><div><span className="panel-kicker">{t('session.step3.kicker')}</span><h3>{t('session.step3.title')}</h3></div><span className="mini-badge">{t('session.step3.badge')}</span></div>
            <p className="panel-description">{t('session.step3.desc')}</p>
            {sessionInspect ? <div className="cookie-table">{cookieRows(sessionInspect.cookie, t).map((row) => <div key={row.name} className={`cookie-row ${row.state}`}><div className="cookie-attr"><strong>{row.name}</strong><span className="mono">{row.value}</span></div><div><small>{t('session.does')}</small><p>{row.does}</p></div><div><small>{t('session.doesNot')}</small><p>{row.doesNot}</p></div></div>)}</div> : <div className="hint">{t('session.loadingCookie')}</div>}
            <div className="cookie-probe"><button className="button secondary" onClick={readDocumentCookie}>{t('session.readDocumentCookie')}</button>{documentCookie !== null && <div className="probe-result"><code>document.cookie = {JSON.stringify(documentCookie)}</code><span className={`pill ${documentCookie.includes('devhub.sid') ? 'bad' : 'good'}`}>{documentCookie.includes('devhub.sid') ? t('session.exposed') : t('session.hidden')}</span></div>}</div>
            <p className="hint">{t('session.portsHint')}</p>
          </section>
          <div className="two-column lifecycle-grid">
            <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('session.step4.kicker')}</span><h3>{t('session.step4.title')}</h3></div><span className="mini-badge">regenerate()</span></div>
              <p className="panel-description">{t('session.step4.desc')}</p>
              <div className="id-compare"><div><small>{t('session.beforeLogin')}</small><code>{shortId(anonId)}</code></div><span className="id-arrow">→</span><div><small>{t('session.afterLogin')}</small><code>{sessionInspect?.authenticated ? shortId(sessionInspect.sessionId) : '—'}</code></div></div>
              {anonId && sessionInspect?.authenticated ? (sessionInspect.sessionId !== anonId ? <div className="verdict good">{t('session.rotated')}</div> : <div className="verdict bad">{t('session.notRotated')}</div>) : <p className="hint">{t('session.rotationHint')}</p>}
            </section>
            <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('session.step5.kicker')}</span><h3>{t('session.step5.title')}</h3></div><span className="mini-badge">{t('session.step5.badge')}</span></div>
              <p className="panel-description">{t('session.step5.desc')}</p>
              <div className="ghost-id"><small>{t('session.stolenId')}</small><code>{ghostId ? shortId(ghostId) : t('session.loginToGet')}</code></div>
              <button className="button danger full" disabled={!ghostId || !vulnerableModes} onClick={replayGhost}>{vulnerableModes ? t('session.replay') : t('common.disabledVulnerable')} <span>→</span></button>
              {replayResult && (replayResult.authenticated ? <div className="verdict bad"><Rich text={t('session.replayAuthenticated', { user: replayResult.user.username })}/></div> : <div className="verdict good">{replayResult.found ? t('session.revoked') : t('session.revokedDestroyed')}</div>)}
              {replayResult?.authenticated && <p className="hint">{t('session.replayNext')}</p>}
            </section>
          </div>
          <div className="callout"><span className="callout-icon">i</span><div><strong>{t('session.callout.title')}</strong><p><Rich text={t('session.callout.body')}/></p></div></div>
        </>}
        {tab === 'jwt' && <>
          <section className="page-heading"><div><div className="eyebrow muted">{t('jwt.eyebrow')}</div><h1>JWT <span>Inspector.</span></h1><p>{t('jwt.lead')}</p></div><div className="heading-symbol green">⌘</div></section>
          <section className="panel token-toolbar"><div><span className="panel-kicker">{step('01')}</span><h3>{t('jwt.step1.title')}</h3><p className="panel-description">{t('jwt.step1.desc')}</p></div><div className="button-row"><button className="button primary" disabled={busy} onClick={() => issueToken('member')}>{busy ? t('jwt.issuing') : t('jwt.issue')} <span>→</span></button><button className="button secondary" disabled={busy} onClick={() => issueToken('admin')}>{t('jwt.issueAdmin')}</button></div></section>
          <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{step('02')}</span><h3>{t('jwt.step2.title')}</h3></div><span className="mini-badge">HEADER . PAYLOAD . SIGNATURE</span></div>
            <div className="fixture-row"><span className="fixture-label">{t('jwt.prepared')}</span>{fixtures.map((fixture) => <button key={fixture.id} title={fixtureDescription(fixture)} className={`fixture-chip ${activeFixture === fixture.id ? 'active' : ''} ${fixture.failsAt ? 'bad' : 'good'}`} onClick={() => pickFixture(fixture)}>{fixtureLabel(fixture)}</button>)}{fixtures.length === 0 && <span className="hint">{t('common.loading')}</span>}</div>
            <textarea className="token-input" value={token} onChange={(e) => { setToken(e.target.value); setActiveFixture(null); resetVerification(); }} placeholder={t('jwt.placeholder')} spellCheck={false}/><div className="button-row token-actions"><button className="button secondary" onClick={() => verifyToken()} disabled={!token}>{t('jwt.verify')}</button><button className="button secondary" onClick={tamperPayload} disabled={!tokenParts}>{t('jwt.tamper')}</button><button className="button danger" onClick={createAlgNoneToken}>{t('jwt.algNone')}</button></div>
            <div className="token-parts"><div className="token-part"><div className="part-title"><span className="part-dot purple-dot"/>HEADER</div><JsonPanel value={tokenParts?.header || { alg: '—', typ: 'JWT' }}/></div><div className="token-part"><div className="part-title"><span className="part-dot green-dot"/>PAYLOAD</div><JsonPanel value={tokenParts?.payload || { sub: '—', iss: '—', aud: '—', exp: '—' }}/></div><div className="token-part"><div className="part-title"><span className="part-dot orange-dot"/>SIGNATURE</div><div className="signature-box">{tokenParts?.signature ? `${tokenParts.signature.slice(0, 38)}${tokenParts.signature.length > 38 ? '…' : ''}` : t('jwt.emptySignature')}</div><div className="hint">{t('jwt.decodeHint')}</div></div></div>
          </section>
          <section className="panel verify-panel"><div className="panel-header"><div><span className="panel-kicker">{step('03')}</span><h3>{t('jwt.step3.title')}</h3></div>{inspection ? <span className={`pill ${inspection.accepted ? 'good' : 'bad'}`}>{inspection.httpStatus} · {inspection.accepted ? t('common.accepted') : t('common.rejected')}</span> : <Status result={jwtResult} t={t}/>}</div>
            <div className="mode-switch" role="tablist"><button className={verifierMode === 'strict' ? 'active strict' : ''} onClick={() => chooseMode('strict')}><strong>{t('jwt.strict')}</strong><small>{t('jwt.strictSub')}</small></button><button className={verifierMode === 'naive' ? 'active naive' : ''} disabled={!vulnerableModes} onClick={() => chooseMode('naive')}><strong>{t('jwt.naive')}</strong><small>{vulnerableModes ? t('jwt.naiveSub') : t('common.disabledVulnerable')}</small></button></div>
            {inspection ? <>
              {naiveAcceptedAdmin && <div className="callout danger-callout"><span className="callout-icon">!</span><div><strong>{t('jwt.naiveAdmin.title')}</strong><p>{t('jwt.naiveAdmin.body')}</p></div></div>}
              <div className="two-column trace-grid"><div className="result-block"><div className="result-title"><span>{t('jwt.clientReceives')}</span><span className="mini-badge">HTTP {inspection.httpStatus}</span></div><JsonPanel value={inspection.publicResponse}/><p className="hint">{inspection.accepted ? t('jwt.acceptedHint') : t('jwt.rejectedHint')}</p></div>
              <div className="result-block"><div className="result-title"><span>{t('jwt.trace')}</span><span className="mini-badge">{t(`jwt.badge.${inspection.mode}` as Key)}</span></div><ol className="trace-list">{inspection.steps.map((item) => <li key={item.id} className={`trace-step ${item.state}`}><span className="trace-icon">{STEP_ICON[item.state]}</span><div><strong>{tx(`trace.${item.id}`, item.label)}</strong><small>{translateTraceDetail(item.detail, lang)}</small></div></li>)}</ol></div></div>
            </> : jwtResult ? <div className="result-block"><div className="result-title"><span>{t('jwt.apiResponse')}</span><Status result={jwtResult} t={t}/></div><JsonPanel value={jwtResult.body}/></div> : <div className="empty-result"><div className="empty-check">✓</div><div><strong>{t('jwt.ready')}</strong><p>{t('jwt.readyHint')}</p></div></div>}</section>
          <JwtApiPanel token={token} t={t} />
          <div className="callout"><span className="callout-icon">i</span><div><strong>{t('jwt.takeaway.title')}</strong><p><Rich text={t('jwt.takeaway.body')}/></p></div></div>
        </>}
        {tab === 'password' && <>
          <section className="page-heading"><div><div className="eyebrow muted">{t('password.eyebrow')}</div><h1>{t('password.title1')} <span>{t('password.title2')}</span></h1><p>{t('password.lead')}</p></div><div className="heading-symbol orange">⟡</div></section>
          <PasswordVerifyPanel key={resetKey} t={t} />
          <div className="two-column bench-grid"><section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('password.bench.kicker')}</span><h3>{t('password.bench.title')}</h3></div><span className="mini-badge">BCRYPT</span></div><label>{t('password.sample')}</label><input value={hashPassword} onChange={(e) => setHashPassword(e.target.value)} type="text" autoComplete="off"/><div className="range-heading"><label>{t('password.costFactor')}</label><strong>{cost}</strong></div><input className="range" type="range" min="4" max="16" value={cost} onChange={(e) => setCost(Number(e.target.value))}/><div className="range-labels"><span>4 · {t('password.faster')}</span><span>16 · {t('password.slower')}</span></div><button className="button primary full" disabled={busy || !hashPassword} onClick={hashDemo}>{hashing ? t('password.hashing') : t('password.generate')} <span>→</span></button><p className="hint">{t('password.timingHint')}</p></section>
          <section className="panel"><div className="panel-header"><div><span className="panel-kicker">{t('password.result.kicker')}</span><h3>{t('password.result.title')}</h3></div>{hashResult && <Status result={hashResult} t={t}/>}</div>{hashResult ? <><div className="metric-row"><div><small>{t('password.costFactor')}</small><strong>{hashResult.body?.cost ?? '—'}</strong></div><div><small>{t('password.elapsed')}</small><strong>{hashResult.body?.elapsedMs ?? '—'}<em> ms</em></strong></div></div><div className="hash-value">{hashResult.body?.hash || messageOf(hashResult, t)}</div><p className="hint">{t('password.rerunHint')}</p></> : <div className="empty-result"><div className="empty-check">#</div><div><strong>{t('password.noHash')}</strong><p>{t('password.noHashHint')}</p></div></div>}</section></div>
          <section className="panel leak-panel"><div className="panel-header"><div><span className="panel-kicker">{t('leak.kicker')}</span><h3>{t('leak.title')}</h3></div><span className="mini-badge">{t('leak.badge')}</span></div>
            <p className="panel-description">{t('leak.desc')}</p>
            <div className="button-row"><button className="button secondary" disabled={busy} onClick={loadLeak}>{leak ? t('leak.reload') : t('leak.open')}</button><button className="button danger" disabled={!leak || cracking} onClick={runCrack}>{cracking ? t('leak.cracking') : t('leak.crack', { n: crack?.wordlistSize ?? 25 })}</button></div>
            {leak && <div className="leak-table-wrap"><table className="leak-table"><thead><tr><th>{t('leak.user')}</th><th>{t('leak.plaintext')} <small>{t('leak.instructorView')}</small></th><th>{t('leak.sha')}</th><th>{t('leak.bcrypt')}</th></tr></thead><tbody>{leak.map((row) => { const sha = crackedBy('sha256', row.username); const bc = crackedBy('bcrypt', row.username); return <tr key={row.username}>
              <td><strong>{row.username}</strong></td>
              <td className="mono">{row.plaintext}</td>
              <td className={`mono ${row.sha256SharedWith.length ? 'duplicate' : ''}`}>{row.sha256.slice(0, 20)}…{row.sha256SharedWith.length > 0 && <span className="dup-tag">{t('leak.sameAs', { names: row.sha256SharedWith.join(', ') })}</span>}{crack && <span className={`crack-tag ${sha ? 'bad' : 'good'}`}>{sha ? t('leak.cracked', { password: sha.password }) : t('leak.survived')}</span>}</td>
              <td className="mono">{row.bcrypt.slice(0, 29)}…{crack && <span className={`crack-tag ${bc ? 'bad' : 'good'}`}>{bc ? t('leak.cracked', { password: bc.password }) : crack.bcrypt.finished ? t('leak.survived') : t('leak.notReached')}</span>}</td>
            </tr>; })}</tbody></table></div>}
            {crack && <div className="two-column crack-grid">
              <div className="crack-card bad"><span className="panel-kicker">{t('crack.shaKicker')}</span><div className="metric-row"><div><small>{t('crack.cracked')}</small><strong>{crack.sha256.cracked.length}<em> / {crack.accounts}</em></strong></div><div><small>{t('crack.time')}</small><strong>{crack.sha256.elapsedMs}<em> ms</em></strong></div><div><small>{t('crack.rate')}</small><strong>{Number(crack.sha256.guessesPerSecond).toLocaleString(locale)}</strong></div></div><p className="hint">{t('crack.shaHint', { n: crack.sha256.guessesTried })}</p></div>
              <div className="crack-card good"><span className="panel-kicker">{t('crack.bcryptKicker', { cost: crack.bcrypt.cost })}</span><div className="metric-row"><div><small>{t('crack.cracked')}</small><strong>{crack.bcrypt.cracked.length}<em> / {crack.accounts}</em></strong></div><div><small>{t('crack.time')}</small><strong>{crack.bcrypt.elapsedMs}<em> ms</em></strong></div><div><small>{t('crack.rate')}</small><strong>{Number(crack.bcrypt.guessesPerSecond).toLocaleString(locale)}</strong></div></div><p className="hint">{crack.bcrypt.finished ? t('crack.finished', { n: crack.bcrypt.guessesTried }) : t('crack.stopped', { n: crack.bcrypt.guessesTried, budget: crack.bcrypt.budgetMs / 1000, full: crack.bcrypt.estimatedFullRunSeconds })} {t('crack.saltHint')}</p></div>
            </div>}
            {crack && <div className="scale-row"><span className="panel-kicker">{t('scale.kicker', { n: Number(crack.realWordlistSize).toLocaleString(locale) })}</span><div><span>{t('scale.sha')}</span><strong className="bad-text">{formatDuration(crack.sha256.realWordlistSeconds, t)}</strong></div><div><span>{t('scale.bcrypt', { cost: crack.bcrypt.cost })}</span><strong className="good-text">{formatDuration(crack.bcrypt.realWordlistSecondsPerAccount, t)}</strong></div><div><span>{t('scale.gap')}</span><strong>{Math.round(crack.sha256.guessesPerSecond / crack.bcrypt.guessesPerSecond).toLocaleString(locale)}×</strong></div></div>}
            {crack && <div className="callout"><span className="callout-icon">i</span><div><strong>{t('crack.notice.title')}</strong><p><Rich text={t('crack.notice.body', { names: crack.neverInWordlist.join(', ') })}/></p></div></div>}
          </section>
          <div className="concept-strip single"><div><span className="strip-index">A</span><strong>{t('password.stripA.title')}</strong><p>{t('password.stripA.desc')}</p></div><div><span className="strip-index">B</span><strong>{t('password.stripB.title')}</strong><p>{t('password.stripB.desc')}</p></div><div><span className="strip-index">C</span><strong>{t('password.stripC.title')}</strong><p>{t('password.stripC.desc')}</p></div></div>
        </>}
        {notice && <div className="toast" role="status"><span>●</span>{notice}<button onClick={() => setNotice('')} aria-label={t('common.dismiss')}>×</button></div>}
        <footer className="page-footer"><span>DEVHUB AUTH LAB <b>·</b> {t('footer.edu')}</span><span>{t('footer.builtFor')} <strong>Break the Login</strong></span></footer>
      </div>
    </main>
    {inspectorOpen && <aside className="inspector-drawer" aria-label={t('inspector.kicker')}>
      <div className="inspector-head"><div><span className="panel-kicker">{t('inspector.kicker')}</span><h3>{t('inspector.title')}</h3></div><div className="button-row"><button className="button secondary" onClick={clearInspector}>{t('inspector.clear')}</button><button className="inspector-close" onClick={() => setInspectorOpen(false)} aria-label={t('inspector.close')}>×</button></div></div>
      <p className="hint">{t('inspector.hint')}</p>
      <div className="inspector-list">{inspectorEntries.length === 0 && <div className="empty-result"><div><strong>{t('inspector.empty')}</strong><p>{t('inspector.emptyHint')}</p></div></div>}{inspectorEntries.map((entry) => <div key={entry.id} className="inspector-entry">
        <div className="inspector-line"><span className={`method method-${entry.method.toLowerCase()}`}>{entry.method}</span><span className="mono path">{entry.path}</span><span className={`status-code code-${entry.status}`}>{entry.status}</span></div>
        <dl>{entry.authorization && <><dt>→ Authorization</dt><dd>{entry.authorization}</dd></>}{entry.cookie && <><dt>→ Cookie</dt><dd>{entry.cookie}</dd></>}{entry.setCookie.map((line, index) => <Fragment key={index}><dt>← Set-Cookie</dt><dd>{line}</dd></Fragment>)}{entry.wwwAuthenticate && <><dt>← WWW-Authenticate</dt><dd>{entry.wwwAuthenticate}</dd></>}{!entry.authorization && !entry.cookie && entry.setCookie.length === 0 && !entry.wwwAuthenticate && <><dt>{t('inspector.credentials')}</dt><dd>{t('inspector.noneSent')}</dd></>}</dl>
        <small className="inspector-meta">{new Date(entry.at).toLocaleTimeString(locale)} · {entry.durationMs} ms</small>
      </div>)}</div>
    </aside>}
  </div>;
}
