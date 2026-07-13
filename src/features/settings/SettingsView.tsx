import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { db } from '../../db/db';
import { useSettings } from '../../hooks/useDb';
import { useConfirm } from '../../components/ConfirmProvider';

export default function SettingsView() {
  const settings = useSettings();
  const confirmDialog = useConfirm();

  const toggleDog = () => {
    if (settings) {
      db.settings.update(1, { dogEnabled: !settings.dogEnabled });
    }
  };

  const replayTutorial = async () => {
    if (settings) {
      await db.settings.update(1, { tutorialSeen: false });
      confirmDialog({
        title: 'Tutorial Reset',
        message: 'Tutorial will replay next time you open the Home dashboard!',
        type: 'info',
        confirmText: 'Got it',
      });
    }
  };

  // Export tables as JSON file
  const handleBackup = async () => {
    try {
      const data = {
        projects: await db.projects.toArray(),
        tasks: await db.tasks.toArray(),
        timeEntries: await db.timeEntries.toArray(),
        notes: await db.notes.toArray(),
        ideas: await db.ideas.toArray(),
        habits: await db.habits.toArray(),
        habitLogs: await db.habitLogs.toArray(),
        settings: await db.settings.toArray(),
      };
      
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed:', error);
      confirmDialog({
        title: 'Backup Failed',
        message: 'Failed to back up your data.',
        type: 'danger',
        confirmText: 'Close',
      });
    }
  };

  // Import JSON file to restore tables
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = await confirmDialog({
      title: 'Overwrite Data?',
      message: 'Restoring from a backup will OVERWRITE all your current projects, tasks, habits, notes, and settings. This cannot be undone.',
      type: 'danger',
      confirmText: 'Restore Backup',
    });
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file format.');
      }

      // Clear all tables
      await Promise.all([
        db.projects.clear(),
        db.tasks.clear(),
        db.timeEntries.clear(),
        db.notes.clear(),
        db.ideas.clear(),
        db.habits.clear(),
        db.habitLogs.clear(),
        db.settings.clear(),
      ]);

      // Bulk add elements mapping Dates back to native JS Dates
      if (data.projects) {
        await db.projects.bulkAdd(data.projects.map((x: any) => ({
          ...x,
          createdAt: new Date(x.createdAt)
        })));
      }
      if (data.tasks) {
        await db.tasks.bulkAdd(data.tasks.map((x: any) => ({
          ...x,
          createdAt: new Date(x.createdAt),
          dueAt: x.dueAt ? new Date(x.dueAt) : null,
          doneAt: x.doneAt ? new Date(x.doneAt) : null,
        })));
      }
      if (data.timeEntries) {
        await db.timeEntries.bulkAdd(data.timeEntries);
      }
      if (data.notes) {
        await db.notes.bulkAdd(data.notes.map((x: any) => ({
          ...x,
          createdAt: new Date(x.createdAt),
          updatedAt: new Date(x.updatedAt)
        })));
      }
      if (data.ideas) {
        await db.ideas.bulkAdd(data.ideas.map((x: any) => ({
          ...x,
          createdAt: new Date(x.createdAt)
        })));
      }
      if (data.habits) {
        await db.habits.bulkAdd(data.habits.map((x: any) => ({
          ...x,
          archivedAt: x.archivedAt ? new Date(x.archivedAt) : null,
          createdAt: x.createdAt ? new Date(x.createdAt) : undefined
        })));
      }
      if (data.habitLogs) {
        await db.habitLogs.bulkAdd(data.habitLogs.map((x: any) => ({
          ...x,
          completedAt: new Date(x.completedAt)
        })));
      }
      if (data.settings) {
        for (const s of data.settings) {
          await db.settings.put(s);
        }
      }

      confirmDialog({
        title: 'Restore Complete',
        message: 'Data restored successfully!',
        type: 'info',
        confirmText: 'Done',
      });
    } catch (error) {
      console.error('Restore failed:', error);
      confirmDialog({
        title: 'Restore Failed',
        message: 'Failed to restore data. Make sure it is a valid Pace backup file.',
        type: 'danger',
        confirmText: 'Close',
      });
    } finally {
      e.target.value = '';
    }
  };

  const firstLetter = (settings?.name || 'Saad').charAt(0).toUpperCase();

  return (
    <motion.div
      className="view active"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="vtitle" style={{ padding: '10px 8px 4px', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '28px' }}>Profile & Settings</div>
      <div className="vsub" style={{ padding: '0 8px 22px', color: 'var(--ink-soft)', fontSize: '15px' }}>Make it yours. Biscuit comes along for the ride.</div>
      
      <div className="bento">
        {/* Profile Card */}
        <div className="card span-6">
          <div className="card-h">
            <div>
              <div className="t">You</div>
              <div className="sub">Personal workspace</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '66px', height: '66px', borderRadius: '22px', background: 'linear-gradient(150deg,var(--violet),var(--sky))', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '26px', color: '#fff' }}>
              {firstLetter}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '22px' }}>{settings?.name || 'Saad'}</div>
              <div style={{ color: 'var(--ink-soft)', fontSize: '14px', fontWeight: 500 }}>Founder · BitLogicHub · Lahore</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-soft)' }}>Your Name</label>
            <input
              type="text"
              value={settings?.name || ''}
              onChange={(e) => db.settings.update(1, { name: e.target.value })}
              placeholder="Saad"
              style={{
                background: 'var(--card-solid)',
                border: '1px solid var(--stroke)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: 'var(--ink)',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
        
        {/* Appearance & Companion */}
        <div className="card span-6">
          <div className="card-h">
            <div>
              <div className="t">Appearance &amp; Companion</div>
              <div className="sub">Theme &amp; the dog</div>
            </div>
          </div>
          
          {/* Dark Mode Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div className="tx">
              <div style={{ fontWeight: 700, fontSize: '14.5px' }}>Dark mode</div>
              <div style={{ color: 'var(--ink-faint)', fontSize: '12.5px', marginTop: '1px' }}>Switch workspace theme</div>
            </div>
            <ThemeToggle />
          </div>

          {/* Biscuit Companion Enable/Disable */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--stroke)' }}>
            <div className="tx">
              <div style={{ fontWeight: 700, fontSize: '14.5px' }}>Biscuit Companion</div>
              <div style={{ color: 'var(--ink-faint)', fontSize: '12.5px', marginTop: '1px' }}>Show the productivity dog</div>
            </div>
            <div
              onClick={toggleDog}
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: settings?.dogEnabled ? 'var(--accent)' : 'var(--stroke-2)',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: settings?.dogEnabled ? 'flex-end' : 'flex-start',
                transition: 'all 0.3s var(--ease)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s var(--ease)',
                }}
              />
            </div>
          </div>

          {/* Replay Tutorial Walkthrough */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--stroke)' }}>
            <div className="tx">
              <div style={{ fontWeight: 700, fontSize: '14.5px' }}>Help &amp; Tutorial</div>
              <div style={{ color: 'var(--ink-faint)', fontSize: '12.5px', marginTop: '1px' }}>Replay Biscuit's tutorial bubble</div>
            </div>
            <button
              onClick={replayTutorial}
              className="btn soft"
              style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '13px' }}
            >
              Replay
            </button>
          </div>
        </div>

        {/* Backup & Recovery Card */}
        <div className="card span-12" style={{ marginTop: '20px' }}>
          <div className="card-h">
            <div>
              <div className="t">Backup &amp; Restore</div>
              <div className="sub">Export your data to a JSON file or restore from a previous backup</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
            <button
              onClick={handleBackup}
              className="btn primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', fontSize: '14px' }}
            >
              <Icons.Download size={16} />
              Back up my data
            </button>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              />
              <button
                className="btn soft"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', fontSize: '14px', zIndex: 1 }}
              >
                <Icons.Upload size={16} />
                Restore from backup
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px', color: 'var(--ink-faint)', fontSize: '12.5px', lineHeight: 1.4 }}>
            <Icons.AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--coral)' }} />
            <span>
              Restoring from a backup will overwrite all current projects, tasks, habits, and notes. Ensure your backup file is valid.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
