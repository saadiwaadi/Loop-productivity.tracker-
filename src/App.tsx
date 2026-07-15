import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Dog from './components/dog/Dog';
import CommandPalette from './components/CommandPalette';
import { useSettings } from './hooks/useDb';
import { ConfirmProvider } from './components/providers/ConfirmProvider';
import { useSyncStatus } from './hooks/useSyncStatus';

function SyncStatusIndicator() {
  const syncStatus = useSyncStatus();

  let label = 'Synced';
  let dotClass = 'synced';

  if (syncStatus === 'Syncing') {
    label = 'Syncing...';
    dotClass = 'syncing';
  } else if (syncStatus === 'Offline') {
    label = 'Offline';
    dotClass = 'offline';
  } else if (syncStatus === 'Waiting for Retry' || syncStatus === 'Error') {
    label = 'Sync Error';
    dotClass = 'error';
  }

  return (
    <div className="sync-badge">
      <span className={`sync-dot ${dotClass}`} />
      <span>{label}</span>
    </div>
  );
}

export default function AppLayout() {
  const settings = useSettings();

  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings?.theme]);

  return (
    <ConfirmProvider>
      {/* Background ambient blobs */}
      <div className="ambient">
        <div className="blob a"></div>
        <div className="blob b"></div>
        <div className="blob c"></div>
        <div className="blob d"></div>
      </div>

      {/* Main app layout shell */}
      <div className="app">
        {/* Sidebar Nav Rail */}
        <nav className="rail">
          <div className="brand-dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="#33420A" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 0 20" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          
          <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M9.5 20v-6h5v6" />
            </svg>
            <span className="tip">Home</span>
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M3 9h18M8 4v5" />
            </svg>
            <span className="tip">Projects</span>
          </NavLink>

          <NavLink to="/notes" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h9l5 5v13H5z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
            <span className="tip">Notes &amp; Ideas</span>
          </NavLink>

          <NavLink to="/habits" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16h16" />
              <path d="M4 15l4-4 3 3 5-6 4 4" />
            </svg>
            <span className="tip">Habits</span>
          </NavLink>

          <NavLink to="/calendar" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
            </svg>
            <span className="tip">Calendar</span>
          </NavLink>

          <NavLink to="/analyzer" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9v9z" />
              <path d="M12 3a9 9 0 0 1 9 9h-9z" opacity=".4" />
            </svg>
            <span className="tip">Analyzer</span>
          </NavLink>

          <div className="rail-spacer"></div>

          <NavLink to="/settings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            </svg>
            <span className="tip">Profile</span>
          </NavLink>
        </nav>

        {/* Bottom Tab Bar for Mobile */}
        <nav className="mobile-tab-bar">
          <NavLink to="/" end className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M9.5 20v-6h5v6" />
            </svg>
            <span className="label">Home</span>
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M3 9h18M8 4v5" />
            </svg>
            <span className="label">Projects</span>
          </NavLink>

          <NavLink to="/notes" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h9l5 5v13H5z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
            <span className="label">Notes</span>
          </NavLink>

          <NavLink to="/habits" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16h16" />
              <path d="M4 15l4-4 3 3 5-6 4 4" />
            </svg>
            <span className="label">Habits</span>
          </NavLink>

          <NavLink to="/calendar" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
            </svg>
            <span className="label">Calendar</span>
          </NavLink>

          <NavLink to="/analyzer" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9v9z" />
              <path d="M12 3a9 9 0 0 1 9 9h-9z" opacity=".4" />
            </svg>
            <span className="label">Analyzer</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            </svg>
            <span className="label">Profile</span>
          </NavLink>
        </nav>

        {/* Main Content Area */}
        <main className="main">
          <SyncStatusIndicator />
          <div className="scroll">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Biscuit the Dog */}
      <Dog />

      {/* Cmd+K Command Palette */}
      <CommandPalette />
    </ConfirmProvider>
  );
}
