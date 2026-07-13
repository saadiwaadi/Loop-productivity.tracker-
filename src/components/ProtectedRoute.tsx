import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-1)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            className="brand-dot"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card-solid)',
              borderRadius: '50%',
              border: '1px solid var(--stroke-2)',
              boxShadow: 'var(--shadow-soft)',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{ width: '24px', height: '24px' }}
            >
              <path d="M12 2a10 10 0 1 0 0 20" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13.5px', color: 'var(--ink-soft)' }}>
            Restoring session...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
