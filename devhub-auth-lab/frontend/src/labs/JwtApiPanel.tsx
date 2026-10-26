import { useEffect, useState } from 'react';
import { ApiResult, request, withBearer } from '../api';
import type { Translate } from '../i18n';
import { JsonPanel, StatusCode } from '../ui';

const TARGETS = ['/api/me', '/api/admin'] as const;

// Sends whatever token is in the editor to the real DevHub API, so the status code comes from the backend.
export function JwtApiPanel({ token, t }: { token: string; t: Translate }) {
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  useEffect(() => { setResults({}); }, [token]);

  async function send(path: string) {
    const result = await request(path, withBearer(token));
    setResults((current) => ({ ...current, [path]: result }));
  }

  return <section className="panel verify-panel">
    <div className="panel-header"><div><span className="panel-kicker">{t('common.step', { n: '04' })}</span><h3>{t('jwtapi.title')}</h3></div><span className="mini-badge">Authorization: Bearer …</span></div>
    <p className="panel-description">{t('jwtapi.desc')}</p>
    <div className="two-column">{TARGETS.map((path) => <div key={path} className="api-target">
      <div className="result-title"><span>GET {path}</span><StatusCode status={results[path]?.status} /></div>
      <button className="button secondary full" disabled={!token} onClick={() => send(path)}>{t('jwtapi.send', { path })} <span>→</span></button>
      {results[path] && <div className="result-block">{results[path].wwwAuthenticate && <div className="header-line"><b>WWW-Authenticate:</b> {results[path].wwwAuthenticate}</div>}<JsonPanel value={results[path].body} /></div>}
    </div>)}</div>
    <p className="hint">{t('jwtapi.hint')}</p>
  </section>;
}
