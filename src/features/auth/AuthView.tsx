import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuth } from '../../components/providers/AuthProvider';
import { signIn as apiSignIn, signUp as apiSignUp } from '../../lib/auth';

export default function AuthView() {
  const { user, signIn: authSignIn } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const signupData = await apiSignUp(email.trim(), password.trim());
        if (signupData.session) {
          if (signupData.user) {
            authSignIn(signupData.user);
            navigate('/', { replace: true });
          }
        } else {
          setSuccessMsg('Account created! Please check your inbox for a verification email.');
        }
      } else {
        const u = await apiSignIn(email.trim(), password.trim());
        if (u) {
          authSignIn(u);
          navigate('/', { replace: true });
        }
      }
    } catch (err: any) {
      console.error('[AuthError]', err);
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="full-screen-min-height"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        background: 'var(--bg-1)',
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      {/* Background blobs */}
      <div className="ambient">
        <div className="blob a"></div>
        <div className="blob b"></div>
        <div className="blob c"></div>
        <div className="blob d"></div>
      </div>

      {/* Auth Card */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--card)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--r-card)',
          boxShadow: 'var(--shadow)',
          padding: '40px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Logo */}
        <div
          className="brand-dot"
          style={{
            width: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--card-solid)',
            borderRadius: '50%',
            marginBottom: '20px',
            border: '1px solid var(--stroke-2)',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ width: '32px', height: '32px' }}
          >
            <path d="M12 2a10 10 0 1 0 0 20" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '8px',
            textAlign: 'center'
          }}
        >
          Loop
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--ink-soft)',
            marginBottom: '32px',
            textAlign: 'center'
          }}
        >
          Your calm productivity companion
        </p>

        {/* Custom Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--stroke-2)',
            padding: '4px',
            borderRadius: '16px',
            width: '100%',
            marginBottom: '24px',
            boxSizing: 'border-box'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13.5px',
              fontFamily: 'var(--font-body)',
              color: !isSignUp ? 'var(--ink)' : 'var(--ink-soft)',
              background: !isSignUp ? 'var(--card-solid)' : 'transparent',
              boxShadow: !isSignUp ? 'var(--shadow-soft)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13.5px',
              fontFamily: 'var(--font-body)',
              color: isSignUp ? 'var(--ink)' : 'var(--ink-soft)',
              background: isSignUp ? 'var(--card-solid)' : 'transparent',
              boxShadow: isSignUp ? 'var(--shadow-soft)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div
            style={{
              width: '100%',
              background: 'rgba(255, 138, 107, 0.15)',
              border: '1px solid var(--coral)',
              color: 'var(--ink)',
              padding: '12px 16px',
              borderRadius: '14px',
              fontSize: '13.5px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxSizing: 'border-box'
            }}
          >
            <Icons.AlertCircle size={16} style={{ color: 'var(--coral)', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              width: '100%',
              background: 'rgba(79, 214, 166, 0.15)',
              border: '1px solid var(--mint)',
              color: 'var(--ink)',
              padding: '12px 16px',
              borderRadius: '14px',
              fontSize: '13.5px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxSizing: 'border-box'
            }}
          >
            <Icons.CheckCircle size={16} style={{ color: 'var(--mint)', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)', paddingLeft: '4px' }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '14px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--stroke-2)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)', paddingLeft: '4px' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '14px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--stroke-2)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '16px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '14px',
              height: '46px',
              boxSizing: 'border-box'
            }}
          >
            {loading ? (
              <Icons.Loader size={18} className="animate-spin" />
            ) : isSignUp ? (
              <>
                <Icons.UserPlus size={18} /> Sign Up
              </>
            ) : (
              <>
                <Icons.LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
