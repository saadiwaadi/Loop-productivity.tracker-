import { useEffect } from 'react';
import { db } from '../../db/db';
import { useSettings } from '../../hooks/useDb';

export default function ThemeToggle() {
  const settings = useSettings();
  const theme = settings?.theme || 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    // Write-through to localStorage synchronously so the choice survives
    // even if the tab closes before the Dexie write + live-query round
    // trip settles — that async gap is what let the theme appear to
    // "forget itself" on the next open.
    try {
      localStorage.setItem('pace-theme', newTheme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', newTheme);
    db.settings.update(1, { theme: newTheme });
  };

  return (
    <div className="toggle">
      <button
        type="button"
        className={theme === 'light' ? 'on' : ''}
        onClick={() => toggleTheme('light')}
        aria-label="Light mode"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
        </svg>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'on' : ''}
        onClick={() => toggleTheme('dark')}
        aria-label="Dark mode"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />
        </svg>
      </button>
    </div>
  );
}
