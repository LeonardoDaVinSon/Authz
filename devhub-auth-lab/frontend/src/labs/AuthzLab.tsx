import { useState } from 'react';
import { ApiResult, postJson, request, withBearer } from '../api';
import type { Key, Translate } from '../i18n';
import { JsonPanel, LabHeading, Rich, ScriptStep, ScriptTable, StatusCode } from '../ui';

const PASSWORD = 'DevHub-demo-pass-123!';
type Scenario = { id: 'none' | 'expired' | 'member' | 'admin'; expected: number };
const SCENARIOS: Scenario[] = [
  { id: 'none', expected: 401 },
  { id: 'expired', expected: 401 },
  { id: 'member', expected: 403 },
  { id: 'admin', expected: 200 },
];

export function AuthzLab({ t }: { t: Translate }) {
  const [results, setResults] = useState<Record<string, ApiResult | undefined>>({});
  const [last, setLast] = useState<{ step: ScriptStep; result: ApiResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bearer, setBearer] = useState<Record<string, ApiResult>>({});

  const login = (email: string) => postJson('/session/login', { email, password: PASSWORD });
  const steps: ScriptStep[] = [
    { id: 'me-anon', label: t('authz.s1'), endpoint: 'GET /api/me', expected: 401, run: () => request('/api/me') },
    { id: 'login-member', label: t('authz.s2'), endpoint: 'POST /session/login · member@devhub.local', expected: 201, run: () => login('member@devhub.local') },
    { id: 'me-member', label: t('authz.s3'), endpoint: 'GET /api/me', expected: 200, run: () => request('/api/me') },
    { id: 'admin-member', label: t('authz.s4'), endpoint: 'GET /api/admin', expected: 403, run: () => request('/api/admin') },
    { id: 'login-admin', label: t('authz.s5'), endpoint: 'POST /session/login · admin@devhub.local', expected: 201, run: () => login('admin@devhub.local') },
    { id: 'admin-admin', label: t('authz.s6'), endpoint: 'GET /api/admin', expected: 200, run: () => request('/api/admin') },
  ];

  async function run(step: ScriptStep) {
    setBusy(true);
    const result = (await step.run()) as ApiResult;
    setResults((current) => ({ ...current, [step.id]: result }));
    setLast({ step, result });
    setBusy(false);
  }

  async function runScenario(scenario: Scenario) {
    let token: string | undefined;
    if (scenario.id === 'expired') {
      const fixtures = await request('/lab/jwt/fixtures');
      token = fixtures.ok ? fixtures.body.find((fixture: { id: string }) => fixture.id === 'expired')?.token : undefined;
    } else if (scenario.id !== 'none') {
      const issued = await postJson('/jwt/issue-demo-token', { role: scenario.id });
      token = issued.body?.accessToken;
    }
    const result = await request('/api/admin', token ? withBearer(token) : { credentials: 'omit' });
    setBearer((current) => ({ ...current, [scenario.id]: result }));
  }

  const lastMe = last?.result.ok && last.result.body?.email ? last.result.body : null;
  const anonLoggedIn = results['me-anon']?.status === 200;

  return <>
    <LabHeading eyebrow={t('authz.eyebrow')} title="401" accent={t('authz.titleAccent')} lead={t('authz.lead')} symbol="⊘" tone="purple" />
    <div className="two-column authz-grid">
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('authz.scriptKicker')}</span><h3>{t('authz.scriptTitle')}</h3></div><span className="mini-badge">{t('authz.badge')}</span></div>
        <p className="panel-description">{t('authz.scriptDesc')}</p>
        <ScriptTable steps={steps} results={results} t={t} onRun={run} busy={busy} />
        {anonLoggedIn && <p className="hint warn-text">{t('authz.alreadyLoggedIn')}</p>}
      </section>
      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t('authz.responseKicker')}</span><h3>{last ? last.step.endpoint : t('authz.noResponse')}</h3></div>{last && <StatusCode status={last.result.status} />}</div>
        {last ? <>
          {last.result.wwwAuthenticate && <div className="header-line"><b>WWW-Authenticate:</b> {last.result.wwwAuthenticate}</div>}
          <JsonPanel value={last.result.body ?? {}} />
          <p className="hint">{t(`authz.explain.${last.result.status}` as Key) ?? ''}</p>
        </> : <div className="empty-result"><div className="empty-check">?</div><div><strong>{t('authz.predict')}</strong><p>{t('authz.predictHint')}</p></div></div>}
        <div className={`session-state ${lastMe ? 'signed-in' : ''}`}><div className="avatar">{lastMe ? lastMe.name[0] : '?'}</div><div><strong>{lastMe ? lastMe.email : t('authz.whoUnknown')}</strong><small>{lastMe ? `role = ${lastMe.role} · via ${lastMe.authenticatedVia ?? 'session'}` : t('authz.whoHint')}</small></div></div>
      </section>
    </div>

    <div className="section-heading"><div><div className="eyebrow muted">{t('authz.bearerKicker')}</div><h2>{t('authz.bearerTitle')}</h2></div><span className="small-note">GET /api/admin · Authorization: Bearer …</span></div>
    <div className="scenario-grid">{SCENARIOS.map((scenario) => { const result = bearer[scenario.id]; return <section key={scenario.id} className={`panel scenario-card ${result ? (result.status === scenario.expected ? 'matched' : 'mismatch') : ''}`}>
      <div className="panel-header"><div><span className="panel-kicker">GET /api/admin</span><h3>{t(`status.${scenario.id}.title` as Key)}</h3></div>{result && <StatusCode status={result.status} />}</div>
      <p className="panel-description"><strong>{t('status.sends')}</strong> {t(`status.${scenario.id}.sends` as Key)}<br/><strong>{t('status.asks')}</strong> {t(`status.${scenario.id}.question` as Key)}</p>
      {result ? <><div className="result-block"><div className="result-title"><span>{t('status.response')}</span></div>{result.wwwAuthenticate && <div className="header-line"><b>WWW-Authenticate:</b> {result.wwwAuthenticate}</div>}<JsonPanel value={result.body}/></div><p className="hint">{t(`status.${scenario.id}.lesson` as Key)}</p></> : <div className="predict">{t('status.prediction')} <span>401</span><span>403</span><span>200</span></div>}
      <button className="button secondary full" onClick={() => runScenario(scenario)}>{result ? t('status.sendAgain') : t('status.send')} <span>→</span></button>
    </section>; })}</div>
    <div className="callout"><span className="callout-icon">i</span><div><strong>{t('status.rule.title')}</strong><p><Rich text={t('status.rule.body')}/></p></div></div>
    <div className="callout"><span className="callout-icon">!</span><div><strong>{t('authz.uiTitle')}</strong><p><Rich text={t('authz.uiBody')}/></p></div></div>
  </>;
}
