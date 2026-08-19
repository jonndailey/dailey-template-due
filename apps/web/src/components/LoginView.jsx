import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    keys: ['j', 'k'],
    label: 'Vim navigation',
    desc: 'Move, complete, pin, and schedule without ever touching the mouse.',
  },
  {
    keys: ['b'],
    label: 'Blitz focus sprints',
    desc: 'Time-boxed runs that surface your next task and clear the stack fast.',
  },
  {
    keys: ['f'],
    label: 'Quick switch',
    desc: 'Jump between projects, assignees, and commands from one palette.',
  },
  {
    keys: ['⌥', 'n'],
    label: 'Notes in markdown',
    desc: 'Context, checklists, and follow-ups attached to every task.',
  },
  {
    keys: ['x'],
    label: 'One-key complete',
    desc: 'Tap x to finish. The status line keeps every shortcut in view.',
  },
  {
    keys: ['API'],
    label: 'REST API access',
    desc: 'Manage tasks programmatically and automate your whole workflow.',
  },
];

const PREVIEW_TASKS = [
  {
    title: 'Finalize Q3 budget proposal for leadership',
    dot: '#8B5CF6',
    meta: 'you · Due today',
    metaColor: '#73D1F6',
    selected: true,
  },
  {
    title: 'Review and merge the staging branch',
    dot: '#2F7FE0',
    meta: 'you · Due today',
    metaColor: '#73D1F6',
    selected: false,
  },
  {
    title: 'Send onboarding docs to new hire',
    dot: '#8B5CF6',
    meta: 'alex · Tomorrow',
    metaColor: 'rgba(174,187,208,0.6)',
    selected: false,
  },
  {
    title: 'Renew SSL certificate before expiry',
    dot: '#38BDF8',
    meta: 'you · Jun 12',
    metaColor: 'rgba(174,187,208,0.6)',
    selected: false,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClipboardMark({ size = 22, borderRadius = 7 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius,
      background: 'linear-gradient(140deg, #0093CB, #315FAC)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 14 14" fill="none">
        <rect x="2" y="3" width="10" height="10" rx="1.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.3" />
        <path d="M5 3V2.5A0.5 0.5 0 015.5 2h3A0.5 0.5 0 019 2.5V3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4.5 7h5M4.5 9.5h3" stroke="rgba(255,255,255,0.85)" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function KbdChip({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 4, padding: '1px 5px', fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#EAF0F8',
    }}>
      {label}
    </span>
  );
}

// ─── Sign-in form panel ───────────────────────────────────────────────────────

function SignInPanel({
  mode, setMode, mfaChallenge, mfaCode, setMfaCode,
  email, setEmail, password, setPassword,
  name, setName, confirmPassword, setConfirmPassword,
  selectedPlan, setSelectedPlan,
  error, submitting,
  handleSubmit, handleSignup, handleMfa,
  onClose,
}) {
  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', color: '#EAF0F8',
    boxSizing: 'border-box', outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'rgba(234,240,248,0.55)', marginBottom: 5,
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
  };

  const fieldStyle = { marginBottom: 14 };

  const btnPrimary = {
    width: '100%', padding: '11px 20px',
    background: '#73D1F6', color: '#08111B',
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const linkBtn = {
    background: 'none', border: 'none',
    color: '#73D1F6', cursor: 'pointer',
    fontSize: 12, padding: 0, fontFamily: 'inherit',
  };

  return (
    <>
      {mfaChallenge ? (
        <form onSubmit={handleMfa}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#EAF0F8' }}>
            MFA Verification
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Code</label>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              type="text" required autoComplete="one-time-code"
              style={inputStyle}
            />
          </div>
          {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      ) : mode === 'login' ? (
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#EAF0F8' }}>
            Sign in to Dailey Due
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email" required autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password" required autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(234,240,248,0.4)', marginTop: 14, marginBottom: 0 }}>
            No account?{' '}
            <button type="button" onClick={() => { setMode('signup'); }} style={linkBtn}>
              Join the Beta
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#EAF0F8' }}>
            Join the Beta
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text" required autoComplete="name"
              placeholder="Jane Smith"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email" required autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password" required autoComplete="new-password"
              placeholder="Min 8 chars"
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password" required autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          {/* Plan selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[
              { key: 'monthly', label: '$10/mo', sub: 'Monthly' },
              { key: 'annual', label: '$100/yr', sub: 'Save $20' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedPlan(p.key)}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8,
                  cursor: 'pointer', textAlign: 'center',
                  border: selectedPlan === p.key
                    ? '2px solid #73D1F6'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: selectedPlan === p.key
                    ? 'rgba(115,209,246,0.1)'
                    : 'rgba(255,255,255,0.04)',
                  color: '#EAF0F8', fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                <div>{p.label}</div>
                <div style={{
                  fontSize: 10, fontWeight: 400,
                  color: p.key === 'annual' ? '#73D1F6' : 'rgba(255,255,255,0.4)',
                }}>{p.sub}</div>
              </button>
            ))}
          </div>

          {error && <div style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Creating...' : 'Start Free Trial'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(234,240,248,0.4)', marginTop: 14, marginBottom: 0 }}>
            Have an account?{' '}
            <button type="button" onClick={() => { setMode('login'); }} style={linkBtn}>
              Sign In
            </button>
          </p>
        </form>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoginView() {
  const { login, submitMfa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState('login');
  const [showSignIn, setShowSignIn] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('annual');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await login({ email, password });
      if (response?.mfa_required) setMfaChallenge(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setError('');
    if (!name.trim() || name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) { setError('Must contain uppercase, lowercase, and a number'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Registration failed');

      const loginResult = await login({ email, password });
      if (loginResult?.mfa_required) { setMfaChallenge(loginResult); return; }

      const token = localStorage.getItem('dailey_assignments_token') || data.access_token;
      if (token) {
        const checkoutRes = await fetch('/api/v1/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ plan: selectedPlan }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.checkout_url) { window.location.href = checkoutData.checkout_url; return; }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfa(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitMfa({
        challenge_token: mfaChallenge.challenge_token,
        challenge_id: mfaChallenge.challenge_id,
        code: mfaCode,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openSignIn(m) {
    setMode(m);
    setError('');
    setShowSignIn(true);
  }

  // ── Shared tokens ──────────────────────────────────────────────────────────
  const sky = '#73D1F6';
  const ink = '#08111B';
  const surface = '#121826';
  const text = '#EAF0F8';
  const mono = "'JetBrains Mono', monospace";

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E16', color: text, fontFamily: "'Poppins', sans-serif", overflowX: 'hidden' }}>

      {/* ── Decorative blur circles ───────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {/* Circle 1 — sky top-right */}
        <div style={{
          position: 'absolute', width: 460, height: 460, borderRadius: '50%',
          background: '#73D1F6', top: -120, right: -80,
          opacity: 0.12, filter: 'blur(2px)',
        }} />
        {/* Circle 2 — navy mid-right */}
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          background: '#315FAC', top: 180, right: 220,
          opacity: 0.10, filter: 'blur(2px)',
        }} />
        {/* Circle 3 — amber bottom-left */}
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: '#F2B33D', bottom: -100, left: -60,
          opacity: 0.08, filter: 'blur(2px)',
        }} />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          padding: 'clamp(14px, 4vw, 20px) clamp(16px, 5vw, 28px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ClipboardMark size={22} borderRadius={7} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: text }}>
            Dailey<span style={{ color: sky }}>Due</span>
          </span>
          <span style={{
            fontFamily: mono, fontSize: 9.5, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: sky,
            background: 'rgba(115,209,246,0.13)',
            borderRadius: 4, padding: '2px 7px',
          }}>Beta</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setShowSignIn(!showSignIn); setMode('login'); setError(''); }}
            style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              color: text, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* ── Sign-in overlay (centered modal, works on all screen sizes) ──── */}
      {showSignIn && (
        <>
          <div
            onClick={() => setShowSignIn(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(3,6,12,0.7)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(360px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            background: '#141B2D',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 24,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            zIndex: 1000,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardMark size={18} borderRadius={5} />
                <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Dailey<span style={{ color: sky }}>Due</span></span>
              </div>
              <button onClick={() => setShowSignIn(false)} style={{ background: 'none', border: 'none', color: 'rgba(234,240,248,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
            <SignInPanel
              mode={mode} setMode={(m) => { setMode(m); setError(''); }}
              mfaChallenge={mfaChallenge}
              mfaCode={mfaCode} setMfaCode={setMfaCode}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              name={name} setName={setName}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan}
              error={error} submitting={submitting}
              handleSubmit={handleSubmit}
              handleSignup={handleSignup}
              handleMfa={handleMfa}
              onClose={() => setShowSignIn(false)}
            />
          </div>
        </>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: 880, margin: 'clamp(32px, 8vw, 60px) auto 0',
          padding: '0 clamp(16px, 5vw, 28px)', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: mono, fontSize: 'clamp(10px, 2vw, 12px)', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: sky, marginBottom: 16,
          }}>
            keyboard-first task management
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 9vw, 72px)', fontWeight: 800,
            lineHeight: 0.98, letterSpacing: '-0.03em', color: text,
            margin: '0 0 20px', whiteSpace: 'pre-line',
          }}>
            {'Think faster\nthan you click.'}
          </h1>

          <p style={{
            fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 300, lineHeight: 1.6,
            color: 'rgba(234,240,248,0.65)',
            maxWidth: 600, margin: '0 auto 28px',
          }}>
            Vim-style navigation. Blitz focus sprints. A status line that always shows
            your next keystroke. Built for the people who actually run the small
            businesses that run the world.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <button
              onClick={() => openSignIn('login')}
              style={{
                background: sky, color: ink,
                padding: '13px 22px', borderRadius: 8,
                fontSize: 15, fontWeight: 600, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', minWidth: 160,
              }}
            >
              Launch the app →
            </button>
            <button
              onClick={() => openSignIn('signup')}
              style={{
                background: 'transparent', color: text,
                padding: '13px 22px', borderRadius: 8,
                fontSize: 15, fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', fontFamily: 'inherit', minWidth: 140,
              }}
            >
              Join the beta
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, fontFamily: mono, fontSize: 12,
            color: 'rgba(234,240,248,0.4)', flexWrap: 'wrap',
          }}>
            press <KbdChip label="j" /> <KbdChip label="k" /> to move ·{' '}
            <KbdChip label="x" /> to finish · <KbdChip label="b" /> to blitz
          </div>
        </div>
      </section>

      {/* ── App preview (fake browser chrome) ────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: 680, margin: 'clamp(32px, 6vw, 50px) auto 0',
          padding: '0 clamp(16px, 5vw, 28px)',
        }}>
          <div style={{
            borderRadius: '12px 12px 10px 10px',
            border: '1px solid rgba(255,255,255,0.09)',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          }}>
            {/* Chrome bar */}
            <div style={{
              background: surface,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <ClipboardMark size={22} borderRadius={6} />
              <span style={{ fontWeight: 700, fontSize: 13, color: text }}>Ready Now</span>
              <span style={{
                marginLeft: 'auto',
                fontFamily: mono, fontSize: 11,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 999, padding: '2px 8px', color: 'rgba(234,240,248,0.7)',
              }}>4</span>
            </div>

            {/* Task rows */}
            {PREVIEW_TASKS.map((task, i) => (
              <div
                key={i}
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  padding: '0 16px',
                  height: 42,
                  display: 'flex', alignItems: 'center', gap: 11,
                  background: task.selected
                    ? 'rgba(115,209,246,0.09)'
                    : 'rgba(10,14,22,0.6)',
                }}
              >
                {/* Checkbox outline */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                }} />
                {/* Project dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: task.dot, flexShrink: 0,
                }} />
                {/* Title */}
                <span style={{
                  fontSize: 13, color: text, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </span>
                {/* Meta */}
                <span style={{
                  fontFamily: mono, fontSize: 11,
                  color: task.metaColor, flexShrink: 0,
                }}>
                  {task.meta}
                </span>
              </div>
            ))}

            {/* Status line */}
            <div style={{
              background: '#05080E',
              padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderRadius: '0 0 9px 9px',
              fontFamily: mono, fontSize: 11, color: '#AEBBD0',
            }}>
              <span style={{
                background: 'rgba(115,209,246,0.18)', color: sky,
                borderRadius: 4, padding: '1px 7px', fontWeight: 700, fontSize: 10,
              }}>NORMAL</span>
              <span>4 open</span>
              <span style={{ color: 'rgba(174,187,208,0.45)', marginLeft: 4 }}>
                [j/k] move · [x] done · [b] blitz · [?] help
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: 1080, margin: 'clamp(40px, 8vw, 70px) auto 0',
          padding: '0 clamp(16px, 5vw, 28px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
          gap: 12,
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.label}
              style={{
                background: surface,
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: 20,
              }}
            >
              {/* Kbd chips */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
                {f.keys.map((k) => <KbdChip key={k} label={k} />)}
              </div>
              {/* Title */}
              <div style={{ fontSize: 16, fontWeight: 600, color: text, marginBottom: 6 }}>
                {f.label}
              </div>
              {/* Body */}
              <div style={{
                fontSize: 13, fontWeight: 300, lineHeight: 1.55,
                color: 'rgba(234,240,248,0.55)',
              }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          maxWidth: 1080, margin: 'clamp(32px, 6vw, 60px) auto 0',
          padding: 'clamp(16px, 4vw, 28px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontFamily: mono, fontSize: 11.5,
          color: 'rgba(234,240,248,0.28)',
          flexWrap: 'wrap', gap: 10,
        }}>
          <span>© 2026 Dailey · advanced technology, whimsically delivered</span>
          <button
            onClick={() => openSignIn('login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: sky, fontFamily: mono, fontSize: 11.5,
              padding: 0,
            }}
          >
            Launch app →
          </button>
        </div>
      </footer>
    </div>
  );
}
