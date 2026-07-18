import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, FolderKanban, FileText, TrendingUp, CalendarDays, PieChart, Settings as SettingsIcon,
  Activity, Dumbbell, Apple, Moon, Scale, ClipboardList, HeartPulse, Repeat,
} from 'lucide-react';
import Dog from './components/dog/Dog';
import CommandPalette from './components/CommandPalette';
import { useSettings } from './hooks/useDb';
import { db } from './db/db';
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

interface NavItem {
  to: string;
  end?: boolean;
  label: string;
  Icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
}

const PRODUCTIVITY_NAV: NavItem[] = [
  { to: '/', end: true, label: 'Home', Icon: Home },
  { to: '/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/notes', label: 'Notes', Icon: FileText },
  { to: '/habits', label: 'Habits', Icon: TrendingUp },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/analyzer', label: 'Analyzer', Icon: PieChart },
];

const HEALTH_NAV: NavItem[] = [
  { to: '/health', end: true, label: 'Pulse', Icon: Activity },
  { to: '/health/activity', label: 'Activity', Icon: Dumbbell },
  { to: '/health/nutrition', label: 'Nutrition', Icon: Apple },
  { to: '/health/sleep', label: 'Sleep', Icon: Moon },
  { to: '/health/body', label: 'Body', Icon: Scale },
  { to: '/health/report', label: 'Report', Icon: ClipboardList },
];

export default function AppLayout() {
  const settings = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode follows the route; the stored setting only restores it on app load.
  const isHealth = location.pathname.startsWith('/health');
  const mode = isHealth ? 'health' : 'productivity';
  const nav = isHealth ? HEALTH_NAV : PRODUCTIVITY_NAV;

  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings?.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  // On first load, restore the mode this device was last using
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !settings) return;
    restored.current = true;
    if (settings.mode === 'health' && location.pathname === '/') {
      navigate('/health', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const switchMode = async () => {
    const next = isHealth ? 'productivity' : 'health';
    await db.settings.update(1, { mode: next });
    navigate(next === 'health' ? '/health' : '/');
  };

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
            {isHealth ? (
              <HeartPulse size={24} strokeWidth={2.2} />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 0 20" />
                <path d="M12 7v5l3 2" />
              </svg>
            )}
          </div>

          {nav.map(({ to, end, label, Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
              <Icon size={23} strokeWidth={1.9} />
              <span className="tip">{label}</span>
            </NavLink>
          ))}

          <div className="rail-spacer"></div>

          <button className="nav-btn mode-switch" onClick={switchMode} title={isHealth ? 'Switch to Productivity' : 'Switch to Health'}>
            <Repeat size={21} strokeWidth={1.9} />
            <span className="tip">{isHealth ? 'Productivity mode' : 'Health mode'}</span>
          </button>

          <NavLink to="/settings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={23} strokeWidth={1.9} />
            <span className="tip">Profile</span>
          </NavLink>
        </nav>

        {/* Bottom Tab Bar for Mobile */}
        <nav className="mobile-tab-bar">
          {nav.map(({ to, end, label, Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={2} />
              <span className="label">{label}</span>
            </NavLink>
          ))}
          <NavLink to="/settings" className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={19} strokeWidth={2} />
            <span className="label">Profile</span>
          </NavLink>
        </nav>

        {/* Floating mode switch for mobile */}
        <button className="mobile-mode-switch" onClick={switchMode}>
          {isHealth ? <PieChart size={15} strokeWidth={2.2} /> : <HeartPulse size={15} strokeWidth={2.2} />}
          <span>{isHealth ? 'Loop Work' : 'Loop Health'}</span>
        </button>

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
