import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { db } from '../db/db';

interface CommandItem {
  id: string;
  title: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setActiveIndex(0);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleTheme = async (theme: 'light' | 'dark') => {
    try {
      localStorage.setItem('pace-theme', theme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', theme);
    const current = await db.settings.get(1);
    if (current) {
      await db.settings.update(1, { theme });
    } else {
      await db.settings.put({ id: 1, name: 'Saad', theme, tutorialSeen: false, dogEnabled: true });
    }
  };

  const triggerPet = () => {
    window.dispatchEvent(new CustomEvent('pet-biscuit'));
  };

  const setMode = async (mode: 'productivity' | 'health') => {
    await db.settings.update(1, { mode });
    navigate(mode === 'health' ? '/health' : '/');
    setIsOpen(false);
  };

  const commands: CommandItem[] = [
    {
      id: 'mode-health',
      title: 'Switch to Health Mode',
      icon: <Icons.HeartPulse size={18} />,
      action: () => { setMode('health'); },
    },
    {
      id: 'mode-productivity',
      title: 'Switch to Productivity Mode',
      icon: <Icons.Briefcase size={18} />,
      action: () => { setMode('productivity'); },
    },
    {
      id: 'go-health-pulse',
      title: 'Health: Pulse Dashboard',
      icon: <Icons.Activity size={18} />,
      action: () => { navigate('/health'); setIsOpen(false); },
    },
    {
      id: 'go-health-activity',
      title: 'Health: Activity & Steps',
      icon: <Icons.Dumbbell size={18} />,
      action: () => { navigate('/health/activity'); setIsOpen(false); },
    },
    {
      id: 'go-health-nutrition',
      title: 'Health: Water & Nutrition',
      icon: <Icons.GlassWater size={18} />,
      action: () => { navigate('/health/nutrition'); setIsOpen(false); },
    },
    {
      id: 'go-health-sleep',
      title: 'Health: Sleep',
      icon: <Icons.Moon size={18} />,
      action: () => { navigate('/health/sleep'); setIsOpen(false); },
    },
    {
      id: 'go-health-body',
      title: 'Health: Body & Weight',
      icon: <Icons.Scale size={18} />,
      action: () => { navigate('/health/body'); setIsOpen(false); },
    },
    {
      id: 'go-health-report',
      title: 'Health: Report',
      icon: <Icons.ClipboardList size={18} />,
      action: () => { navigate('/health/report'); setIsOpen(false); },
    },
    {
      id: 'go-home',
      title: 'Go to Home',
      icon: <Icons.Home size={18} />,
      action: () => { navigate('/'); setIsOpen(false); },
    },
    {
      id: 'go-projects',
      title: 'Go to Projects',
      icon: <Icons.FolderArchive size={18} />,
      action: () => { navigate('/projects'); setIsOpen(false); },
    },
    {
      id: 'go-notes',
      title: 'Go to Notes & Ideas',
      icon: <Icons.FileText size={18} />,
      action: () => { navigate('/notes'); setIsOpen(false); },
    },
    {
      id: 'go-habits',
      title: 'Go to Habits',
      icon: <Icons.Activity size={18} />,
      action: () => { navigate('/habits'); setIsOpen(false); },
    },
    {
      id: 'go-analyzer',
      title: 'Go to Analyzer',
      icon: <Icons.PieChart size={18} />,
      action: () => { navigate('/analyzer'); setIsOpen(false); },
    },
    {
      id: 'go-settings',
      title: 'Go to Settings',
      icon: <Icons.Settings size={18} />,
      action: () => { navigate('/settings'); setIsOpen(false); },
    },
    {
      id: 'theme-light',
      title: 'Switch to Light Theme',
      icon: <Icons.Sun size={18} />,
      action: () => { toggleTheme('light'); setIsOpen(false); },
    },
    {
      id: 'theme-dark',
      title: 'Switch to Dark Theme',
      icon: <Icons.Moon size={18} />,
      action: () => { toggleTheme('dark'); setIsOpen(false); },
    },
    {
      id: 'pet-biscuit',
      title: 'Pet Biscuit the Dog',
      icon: <Icons.Heart size={18} />,
      action: () => { triggerPet(); setIsOpen(false); },
    },
  ];

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [search, filtered.length, activeIndex]);

  useEffect(() => {
    const handleNavKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          filtered[activeIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleNavKeys);
    return () => window.removeEventListener('keydown', handleNavKeys);
  }, [isOpen, activeIndex, filtered]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette-box" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Icons.Search size={20} style={{ color: 'var(--ink-faint)' }} />
          <input
            type="text"
            className="cmd-input"
            placeholder="Type a command or search route..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 700, background: 'var(--stroke-2)', padding: '4px 8px', borderRadius: '6px' }}>ESC</span>
        </div>

        <div className="cmd-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: '14px' }}>
              No commands found
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`cmd-item ${idx === activeIndex ? 'active' : ''}`}
                onClick={cmd.action}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {cmd.icon}
                <span>{cmd.title}</span>
                {cmd.shortcut && <span className="cmd-badge">{cmd.shortcut}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
