import { Fragment } from 'react';
import { shorten, type ApiResult } from './api';
import type { Translate } from './i18n';

export function messageOf(result: ApiResult, t: Translate) {
  return result.body?.message || result.body?.error || (result.ok ? t('common.requestSucceeded') : t('common.requestFailed'));
}

// Credentials never appear in full on screen, even inside raw response bodies.
const SENSITIVE_KEY = /token$|^sessionId$|secret|cookie|authorization|password/i;

function redact(key: string, value: unknown) {
  return typeof value === 'string' && SENSITIVE_KEY.test(key) ? shorten(value) : value;
}

export function JsonPanel({ value }: { value: unknown }) {
  return <pre className="json-panel">{JSON.stringify(value, redact, 2)}</pre>;
}

export function Status({ result, t }: { result: ApiResult | null; t: Translate }) {
  if (!result) return <span className="pill neutral">{t('common.notTested')}</span>;
  return <span className={`pill ${result.ok ? 'good' : 'bad'}`}>{result.status || t('common.networkError')} · {result.ok ? t('common.accepted') : t('common.rejected')}</span>;
}

export function StatusCode({ status }: { status?: number }) {
  if (status === undefined) return <span className="status-code pending">···</span>;
  return <span className={`status-code code-${status}`}>{status || 'ERR'}</span>;
}

export function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={index}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

export function LabHeading({ eyebrow, title, accent, lead, symbol, tone }: { eyebrow: string; title: string; accent: string; lead: string; symbol: string; tone: 'purple' | 'green' | 'orange' }) {
  return <section className="page-heading"><div><div className="eyebrow muted">{eyebrow}</div><h1>{title} <span>{accent}</span></h1><p>{lead}</p></div><div className={`heading-symbol ${tone}`}>{symbol}</div></section>;
}

export type ScriptStep = { id: string; label: string; endpoint: string; expected: number | string; run: () => Promise<ApiResult | void>; disabled?: boolean };

// A numbered demo script: each row can show the expected status next to the one the backend actually returned.
export function ScriptTable({ steps, results, t, onRun, busy, showExpected = true }: {
  steps: ScriptStep[];
  results: Record<string, ApiResult | undefined>;
  t: Translate;
  onRun: (step: ScriptStep) => void;
  busy?: boolean;
  showExpected?: boolean;
}) {
  return <ol className="script-table">{steps.map((step, index) => {
    const result = results[step.id];
    const matched = result && (typeof step.expected === 'number' ? result.status === step.expected : result.ok);
    return <li key={step.id} className={`script-row ${result ? (matched ? 'matched' : 'mismatch') : ''}`}>
      <span className="script-index">{String(index + 1).padStart(2, '0')}</span>
      <div className="script-copy"><strong>{step.label}</strong><code>{step.endpoint}</code></div>
      {showExpected && <span className="script-expected">{t('script.expected')} <b>{step.expected}</b></span>}
      <StatusCode status={result?.status} />
      <button className="button secondary" disabled={busy || step.disabled} onClick={() => onRun(step)}>{result ? t('script.again') : t('script.run')} <span>→</span></button>
    </li>;
  })}</ol>;
}
