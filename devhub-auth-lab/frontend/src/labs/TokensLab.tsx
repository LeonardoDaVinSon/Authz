import { useEffect, useState } from 'react';
import { ApiResult, decodeJwtPayload, postJson, request, shorten, withBearer } from '../api';
import type { Key, Translate } from '../i18n';
import { JsonPanel, LabHeading, Rich, StatusCode } from '../ui';

type Pair = { accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number; receivedAt: number };
type LogEntry = { id: number; label: string; endpoint: string; status: number; expected: number; body: unknown };
type FamilyToken = { id: string; preview: string; status: 'active' | 'rotated' | 'revoked'; replacedBy: string | null };
type Family = { familyId: string; user: string; revoked: boolean; revokedReason: string | null; tokens: FamilyToken[] };

let sequence = 0;

const received = (body: Omit<Pair, 'receivedAt'>): Pair => ({ ...body, receivedAt: Math.floor(Date.now() / 1000) });

export function TokensLab({ t }: { t: Translate }) {
  const [shortLived, setShortLived] = useState(false);
  const [pair, setPair] = useState<Pair | null>(null);
  const [previousRefresh, setPreviousRefresh] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { loadState(); }, []);

  async function loadState() {
    const result = await request('/lab/tokens');
    if (result.ok) setFamilies(result.body);
  }

  async function call(labelKey: Key, endpoint: string, expected: number, action: () => Promise<ApiResult>) {
    const result = await action();
    setLog((current) => [{ id: ++sequence, label: t(labelKey), endpoint, status: result.status, expected, body: result.body }, ...current].slice(0, 12));
    await loadState();
    return result;
  }

  async function login() {
    const result = await call('tokens.login', 'POST /tokens/login', 200, () => postJson('/tokens/login', { email: 'member@devhub.local', password: 'DevHub-demo-pass-123!', shortLived }));
    if (result.ok) { setPair(received(result.body)); setPreviousRefresh(null); }
  }
  async function callApi() {
    if (pair) await call('tokens.useAccess', 'GET /api/me · Bearer <access>', 200, () => request('/api/me', withBearer(pair.accessToken)));
  }
  async function refreshAsAccess() {
    if (pair) await call('tokens.useRefreshAsAccess', 'GET /api/me · Bearer <refresh>', 401, () => request('/api/me', withBearer(pair.refreshToken)));
  }
  async function refresh() {
    if (!pair) return;
    const result = await call('tokens.refresh', 'POST /tokens/refresh', 200, () => postJson('/tokens/refresh', { refreshToken: pair.refreshToken, shortLived }));
    if (result.ok) { setPreviousRefresh(pair.refreshToken); setPair(received(result.body)); }
  }
  async function reuseOld() {
    if (previousRefresh) await call('tokens.reuse', 'POST /tokens/refresh · <old refresh>', 401, () => postJson('/tokens/refresh', { refreshToken: previousRefresh }));
  }
  async function logout() {
    if (pair) await call('tokens.logout', 'POST /tokens/logout', 204, () => postJson('/tokens/logout', { refreshToken: pair.refreshToken }));
  }
  async function refreshAfter() {
    if (pair) await call('tokens.refreshCurrent', 'POST /tokens/refresh · <current refresh>', 401, () => postJson('/tokens/refresh', { refreshToken: pair.refreshToken }));
  }

  const claims = pair ? decodeJwtPayload(pair.accessToken) : null;
  // Count from receipt rather than `exp`: the browser clock may be skewed from the server's.
  const remaining = pair ? pair.expiresIn - (now - pair.receivedAt) : null;

  return <>
    <LabHeading eyebrow={t('tokens.eyebrow')} title="Access" accent={t('tokens.titleAccent')} lead={t('tokens.lead')} symbol="⟳" tone="green" />
    <div className="flow-banner real">{t('tokens.realBanner')}</div>
    <div className="two-column">
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('tokens.clientKicker')}</span><h3>{t('tokens.clientTitle')}</h3></div><span className="mini-badge">member@devhub.local</span></div>
        <label className="check-row"><input type="checkbox" checked={shortLived} onChange={(e) => setShortLived(e.target.checked)} /> {t('tokens.shortLived')}</label>
        <button className="button primary full" onClick={login}>{t('tokens.loginBtn')} <span>→</span></button>
        <div className="token-slots">
          <div className="token-slot access"><small>ACCESS TOKEN · JWT</small><code>{pair ? shorten(pair.accessToken, 16, 6) : '—'}</code>
            {remaining !== null && <span className={`pill ${remaining > 0 ? 'good' : 'bad'}`}>{remaining > 0 ? t('tokens.expiresIn', { s: remaining }) : t('tokens.expired')}</span>}</div>
          <div className="token-slot refresh"><small>REFRESH TOKEN · OPAQUE</small><code>{pair ? shorten(pair.refreshToken, 9, 4) : '—'}</code></div>
          <div className="token-slot old"><small>{t('tokens.oldSlot')}</small><code>{previousRefresh ? shorten(previousRefresh, 9, 4) : '—'}</code></div>
        </div>
        <div className="action-grid">
          <button className="button secondary" disabled={!pair} onClick={callApi}>① {t('tokens.useAccess')}</button>
          <button className="button secondary" disabled={!pair} onClick={refreshAsAccess}>② {t('tokens.useRefreshAsAccess')}</button>
          <button className="button secondary" disabled={!pair} onClick={refresh}>③ {t('tokens.refresh')}</button>
          <button className="button danger" disabled={!previousRefresh} onClick={reuseOld}>④ {t('tokens.reuse')}</button>
          <button className="button danger" disabled={!pair} onClick={logout}>⑤ {t('tokens.logout')}</button>
          <button className="button secondary" disabled={!pair} onClick={refreshAfter}>⑥ {t('tokens.refreshCurrent')}</button>
        </div>
        {claims && <div className="result-block"><div className="result-title"><span>{t('tokens.claims')}</span></div><JsonPanel value={claims} /></div>}
      </section>
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('tokens.serverKicker')}</span><h3>{t('tokens.serverTitle')}</h3></div><span className="mini-badge">GET /lab/tokens</span></div>
        <p className="panel-description">{t('tokens.serverDesc')}</p>
        {families.length === 0 ? <div className="empty-result"><div className="empty-check">∅</div><div><strong>{t('tokens.noFamilies')}</strong><p>{t('tokens.noFamiliesHint')}</p></div></div>
          : <div className="family-list">{families.slice(0, 3).map((family) => <div key={family.familyId} className={`family ${family.revoked ? 'revoked' : ''}`}>
            <div className="family-head"><span className="mono">family {family.familyId}</span><span>{family.user}</span>{family.revoked ? <span className="pill bad">{t('tokens.familyRevoked')} · {family.revokedReason}</span> : <span className="pill good">{t('tokens.familyActive')}</span>}</div>
            <ol className="chain">{family.tokens.map((token) => <li key={token.id} className={`chain-item ${token.status}`}><code>{token.preview}</code><span>{token.status}</span></li>)}</ol>
          </div>)}</div>}
        <div className="result-block"><div className="result-title"><span>{t('tokens.log')}</span></div>
          {log.length === 0 ? <p className="hint">{t('tokens.logEmpty')}</p> : <ol className="event-log">{log.map((entry) => <li key={entry.id} className={entry.status === entry.expected ? 'matched' : 'mismatch'}><StatusCode status={entry.status} /><div><strong>{entry.label}</strong><code>{entry.endpoint}</code></div><span className="script-expected">{t('script.expected')} <b>{entry.expected}</b></span></li>)}</ol>}
        </div>
      </section>
    </div>
    <div className="callout"><span className="callout-icon">i</span><div><strong>{t('tokens.takeawayTitle')}</strong><p><Rich text={t('tokens.takeawayBody')} /></p></div></div>
  </>;
}
