import { useState } from 'react';
import { ApiResult, postJson } from '../api';
import type { Translate } from '../i18n';
import { messageOf } from '../ui';

// bcrypt string: $2b$ + cost$ + 22-char salt + 31-char hash.
function HashParts({ hash }: { hash: string }) {
  return <div className="hash-parts">
    <span className="hp-alg">{hash.slice(0, 4)}</span><span className="hp-cost">{hash.slice(4, 7)}</span><span className="hp-salt">{hash.slice(7, 29)}</span><span className="hp-hash">{hash.slice(29)}</span>
  </div>;
}

export function PasswordVerifyPanel({ t }: { t: Translate }) {
  const [password, setPassword] = useState('correct-horse-battery');
  const [attempt, setAttempt] = useState('correct-horse-battery!');
  const [hashes, setHashes] = useState<(string | null)[]>([null, null]);
  const [verify, setVerify] = useState<{ attempt: string; result: ApiResult } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function hash(slot: 0 | 1) {
    setBusy(true); setError('');
    const result = await postJson('/password/hash-demo', { password });
    if (result.ok) setHashes((current) => current.map((value, index) => (index === slot ? result.body.hash : value)));
    else setError(messageOf(result, t));
    setBusy(false);
  }
  async function check() {
    if (!hashes[0] || !attempt) return;
    setBusy(true);
    const result = await postJson('/password/verify-demo', { password: attempt, hash: hashes[0] });
    setVerify({ attempt, result });
    setBusy(false);
  }
  function changePassword(value: string) {
    setPassword(value); setAttempt(`${value}!`); setHashes([null, null]); setVerify(null);
  }

  const [first, second] = hashes;
  const storedHash = typeof verify?.result.body?.hash === 'string' ? verify.result.body.hash : first;
  return <section className="panel verify-demo">
    <div className="panel-header"><div><span className="panel-kicker">{t('pwv.kicker')}</span><h3>{t('pwv.title')}</h3></div><span className="mini-badge">POST /password/hash-demo · /password/verify-demo</span></div>
    <p className="panel-description">{t('pwv.desc')}</p>
    <div className="two-column">
      <div>
        <label>{t('pwv.password')}</label><input value={password} onChange={(e) => changePassword(e.target.value)} autoComplete="off" />
        <div className="button-row pwv-actions"><button className="button primary" disabled={busy || !password} onClick={() => hash(0)}>{t('pwv.hash1')}</button><button className="button secondary" disabled={busy || !first} onClick={() => hash(1)}>{t('pwv.hash2')}</button></div>
        <label>{t('pwv.attempt')}</label><input value={attempt} onChange={(e) => setAttempt(e.target.value)} autoComplete="off" />
        <div className="button-row pwv-actions"><button className="button secondary" disabled={busy || !first || !attempt} onClick={check}>{t('pwv.verify')}</button></div>
        {error && <p className="hint warn-text">{error}</p>}
      </div>
      <div>
        <div className="hash-legend"><span className="hp-alg">$2b$</span> {t('pwv.legendAlg')} <span className="hp-cost">10$</span> cost <span className="hp-salt">salt</span> {t('pwv.legendSalt')} <span className="hp-hash">hash</span></div>
        <div className="hash-slot"><small>{t('pwv.hashN', { n: 1 })}</small>{first ? <HashParts hash={first} /> : <span className="hint">{t('pwv.empty')}</span>}</div>
        <div className="hash-slot"><small>{t('pwv.hashN', { n: 2 })}</small>{second ? <HashParts hash={second} /> : <span className="hint">{t('pwv.empty')}</span>}</div>
        {first && second && <div className={`verdict ${first !== second ? 'good' : 'bad'}`}>{first !== second ? t('pwv.different') : t('pwv.same')}</div>}
        {verify && <div className={`verdict ${verify.result.body?.match ? 'good' : 'bad'}`}>
          {verify.result.ok
            ? (verify.result.body.match ? t('pwv.matchTrue', { attempt: verify.attempt }) : t('pwv.matchFalse', { attempt: verify.attempt }))
            : messageOf(verify.result, t)}
          <code className="verdict-code">{`{ "match": ${verify.result.body?.match} }`}</code>
          {storedHash && <div className="hash-slot verify-hash"><small>{t('pwv.verifiedHash')}</small><HashParts hash={storedHash} /></div>}
        </div>}
      </div>
    </div>
  </section>;
}
