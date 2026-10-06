import { useEffect, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, LockKeyhole, LogOut, Save, ShieldCheck, Wifi } from 'lucide-react';
import { api } from '../api.js';
import { DEFAULT_STOREFRONT_SETTINGS, NETWORK_NAMES, SPEED_RATINGS } from '../storefrontSettings.js';

const noticeLabels = {
  delivery: 'Delivery notice',
  airtime: 'Airtime requirement',
  wrongNumber: 'Wrong number policy',
  mtnVerification: 'MTN first-order verification notice',
};

export function AdminPage() {
  const [token, setToken] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem('datainn-admin-token');
    if (storedToken) setToken(storedToken);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    setLoading(true);
    api.getAdminSettings(token)
      .then(({ settings: savedSettings }) => {
        if (!alive) return;
        setSettings(savedSettings);
        setDraft(savedSettings);
        setError('');
      })
      .catch((requestError) => {
        if (!alive) return;
        if (requestError.message.includes('sign in again')) {
          window.sessionStorage.removeItem('datainn-admin-token');
          setToken('');
        } else {
          setError(requestError.message);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.adminLogin(email, password);
      window.sessionStorage.setItem('datainn-admin-token', result.token);
      setToken(result.token);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await api.updateAdminSettings(token, draft);
      setSettings(result.settings);
      setDraft(result.settings);
      setMessage('Storefront settings saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem('datainn-admin-token');
    setToken('');
    setSettings(null);
    setDraft(null);
    setMessage('');
    setError('');
  }

  function updateDraft(updater) {
    setDraft((current) => updater(current));
    setMessage('');
  }

  const changed = settings && draft && JSON.stringify(settings) !== JSON.stringify(draft);

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-brand" href="/" aria-label="DataInn home">
          <span className="admin-brand-mark">D</span>
          <span>DataInn <small>OPERATIONS</small></span>
        </a>
        <a className="admin-back-link" href="/"><ArrowLeft size={15} /> Storefront</a>
      </header>

      {!authReady || (token && loading && !draft) ? (
        <div className="admin-loading"><span className="status-pulse" /> Securing your dashboard…</div>
      ) : !token ? (
        <section className="admin-login-card">
          <span className="admin-login-icon"><LockKeyhole size={20} /></span>
          <p className="eyebrow eyebrow-dark">PRIVATE ACCESS</p>
          <h1>Storefront dashboard</h1>
          <p className="admin-lede">Sign in to manage network availability, delivery estimates, and customer notices.</p>
          <form className="admin-login-form" onSubmit={signIn}>
            <label htmlFor="admin-email">Admin email</label>
            <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            {error && <p className="admin-error" role="alert"><CircleAlert size={16} />{error}</p>}
            <button className="button button-ink" type="submit" disabled={loading}><LockKeyhole size={15} />{loading ? 'Signing in…' : 'Sign in securely'}</button>
          </form>
          <p className="admin-secure-note"><ShieldCheck size={14} /> Admin access only · session expires after 4 hours</p>
        </section>
      ) : draft ? (
        <form className="admin-dashboard" onSubmit={saveSettings}>
          <div className="admin-heading">
            <div><p className="eyebrow eyebrow-dark">CONTROL ROOM / GHANA</p><h1>Storefront settings</h1><p>Changes are saved to the live storefront configuration.</p></div>
            <button className="admin-signout" type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
          </div>

          {error && <p className="admin-error admin-feedback" role="alert"><CircleAlert size={16} />{error}</p>}
          {message && <p className="admin-success admin-feedback" role="status"><Check size={16} />{message}</p>}

          <section className="admin-section">
            <div className="admin-section-heading"><span className="admin-section-icon"><Wifi size={18} /></span><div><h2>Network availability</h2><p>Unavailable networks disappear from bundle selection and cannot receive new orders.</p></div></div>
            <div className="admin-network-list">
              {NETWORK_NAMES.map((name) => (
                <label className={`admin-network-row ${draft.networks[name] ? '' : 'is-offline'}`} key={name}>
                  <span className={`admin-network-symbol admin-network-${name.toLowerCase()}`}>{name.slice(0, 1)}</span>
                  <span className="admin-network-name"><strong>{name}</strong><small>{draft.networks[name] ? 'Taking orders' : 'Temporarily offline'}</small></span>
                  <span className="admin-switch">
                    <input
                      type="checkbox"
                      checked={draft.networks[name]}
                      onChange={(event) => updateDraft((current) => ({
                        ...current,
                        networks: { ...current.networks, [name]: event.target.checked },
                      }))}
                      aria-label={`${name} network available`}
                    />
                    <span className="admin-switch-track" aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading"><span className="admin-section-icon"><span className="admin-speed-glyph">↗</span></span><div><h2>MTN delivery estimate</h2><p>Choose the current speed band and the exact note customers will see.</p></div></div>
            <label className="admin-field-label" htmlFor="mtn-speed">Speed rating</label>
            <select id="mtn-speed" value={draft.mtnSpeed.rating} onChange={(event) => updateDraft((current) => ({ ...current, mtnSpeed: { ...current.mtnSpeed, rating: event.target.value } }))}>
              {Object.entries(SPEED_RATINGS).map(([value, rating]) => <option value={value} key={value}>{rating.label}</option>)}
            </select>
            <p className="admin-field-help">Color is assigned automatically: green for quick, purple for within 6 hours, and red for 7+ hours.</p>
            <label className="admin-field-label" htmlFor="mtn-speed-message">Customer-facing estimate</label>
            <textarea id="mtn-speed-message" rows="2" maxLength="500" required value={draft.mtnSpeed.message} onChange={(event) => updateDraft((current) => ({ ...current, mtnSpeed: { ...current.mtnSpeed, message: event.target.value } }))} />
          </section>

          <section className="admin-section">
            <div className="admin-section-heading"><span className="admin-section-icon"><CircleAlert size={18} /></span><div><h2>Customer notices</h2><p>These messages appear before payment. The MTN verification note is shown for MTN orders only.</p></div></div>
            <div className="admin-notice-fields">
              {Object.entries(noticeLabels).map(([key, label]) => (
                <label key={key}><span>{label}</span><textarea rows={key === 'mtnVerification' ? 4 : 2} maxLength="500" required value={draft.notices[key]} onChange={(event) => updateDraft((current) => ({ ...current, notices: { ...current.notices, [key]: event.target.value } }))} /></label>
              ))}
            </div>
          </section>

          <div className="admin-savebar"><p>{changed ? 'You have unsaved changes.' : 'All settings are up to date.'}</p><button className="button button-ink" type="submit" disabled={saving || !changed}><Save size={16} />{saving ? 'Saving…' : 'Save changes'}</button></div>
          {loading && <p className="admin-refreshing">Refreshing dashboard settings…</p>}
        </form>
      ) : token && error ? (
        <section className="admin-login-card">
          <p className="admin-error admin-feedback" role="alert"><CircleAlert size={16} />{error}</p>
          <button className="button button-ink" type="button" onClick={signOut}>Return to sign in</button>
        </section>
      ) : (
        <section className="admin-login-card"><p className="admin-lede">Loading storefront settings…</p></section>
      )}
      <footer className="admin-footer">DATAINN / PRIVATE ADMINISTRATION</footer>
    </main>
  );
}
