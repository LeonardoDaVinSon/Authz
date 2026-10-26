import { useState } from 'react';
import { ApiResult, postJson, request, shorten } from '../api';
import type { Translate } from '../i18n';
import { LabHeading, Rich, ScriptStep, ScriptTable } from '../ui';

type Variant = 'broken' | 'proper';
type Replay = { found: boolean; authenticated: boolean; user: { username: string } | null };

function LogoutColumn({ variant, t, vulnerableModes }: { variant: Variant; t: Translate; vulnerableModes: boolean }) {
  const [results, setResults] = useState<Record<string, ApiResult | undefined>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [busy, setBusy] = useState(false);
  const broken = variant === 'broken';

  const steps: ScriptStep[] = [
    {
      id: 'login', label: t('logout.s1'), endpoint: 'POST /session/login', expected: 201,
      run: async () => {
        const result = await postJson('/session/login', { email: 'member@devhub.local', password: 'DevHub-demo-pass-123!' });
        const inspect = await request('/lab/session/inspect');
        setCopiedId(inspect.ok && inspect.body.authenticated ? inspect.body.sessionId : null);
        setReplay(null);
        return result;
      },
    },
    { id: 'me-before', label: t('logout.s2'), endpoint: 'GET /api/me', expected: 200, run: () => request('/api/me') },
    broken
      ? { id: 'logout', label: t('logout.s3broken'), endpoint: 'POST /lab/session/forget-cookie', expected: 200, run: () => postJson('/lab/session/forget-cookie'), disabled: !vulnerableModes }
      : { id: 'logout', label: t('logout.s3proper'), endpoint: 'POST /session/logout', expected: 204, run: () => postJson('/session/logout') },
    { id: 'me-after', label: t('logout.s4'), endpoint: 'GET /api/me', expected: 401, run: () => request('/api/me') },
  ];

  async function run(step: ScriptStep) {
    setBusy(true);
    const result = (await step.run()) as ApiResult;
    setResults((current) => ({ ...current, [step.id]: result }));
    setBusy(false);
  }

  async function replayCopied() {
    if (!copiedId) return;
    const result = await postJson('/lab/session/replay', { sessionId: copiedId });
    if (result.ok) setReplay(result.body);
  }

  return <section className={`panel logout-column ${variant}`}>
    <div className="panel-header"><div><span className="panel-kicker">{broken ? t('logout.brokenKicker') : t('logout.properKicker')}</span><h3>{broken ? t('logout.brokenTitle') : t('logout.properTitle')}</h3></div><span className={`pill ${broken ? 'bad' : 'good'}`}>{broken ? t('logout.brokenBadge') : t('logout.properBadge')}</span></div>
    <p className="panel-description">{broken ? t('logout.brokenDesc') : t('logout.properDesc')}</p>
    <ScriptTable steps={steps} results={results} t={t} onRun={run} busy={busy} />
    <div className="ghost-id"><small>{t('logout.copiedId')}</small><code>{copiedId ? shorten(copiedId) : t('logout.copiedHint')}</code></div>
    <button className="button danger full" disabled={!copiedId || !vulnerableModes} onClick={replayCopied}>{vulnerableModes ? t('logout.replay') : t('common.disabledVulnerable')} <span>→</span></button>
    {replay && (replay.authenticated
      ? <div className="verdict bad"><Rich text={t('logout.stillAlive', { user: replay.user?.username ?? '' })} /></div>
      : <div className="verdict good">{t('logout.revoked')}</div>)}
  </section>;
}

export function LogoutLab({ t, vulnerableModes }: { t: Translate; vulnerableModes: boolean }) {
  return <>
    <LabHeading eyebrow={t('logout.eyebrow')} title="Logout" accent={t('logout.titleAccent')} lead={t('logout.lead')} symbol="⏻" tone="orange" />
    <div className="two-column">
      <LogoutColumn variant="broken" t={t} vulnerableModes={vulnerableModes} />
      <LogoutColumn variant="proper" t={t} vulnerableModes={vulnerableModes} />
    </div>
    <div className="callout"><span className="callout-icon">i</span><div><strong>{t('logout.takeawayTitle')}</strong><p><Rich text={t('logout.takeawayBody')} /></p></div></div>
  </>;
}
