import { syncTable } from './sync';
import { getCurrentUser } from '../lib/auth';
import { setSyncState, processQueue } from './queueManager';
import db, { setBypassSoftDeleteMiddleware } from './db';

export interface SyncStats {
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Sequentially synchronizes all tables between Dexie and Supabase.
 * Uses incremental pull-then-push sync with conflict resolution.
 */
export async function syncAll(): Promise<SyncStats> {
  const user = await getCurrentUser();
  if (!user) {
    setSyncState('Idle');
    return {
      success: false,
      error: 'User not authenticated. Sync skipped.',
      timestamp: new Date()
    };
  }

  // Check network status before starting
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncState('Offline');
    return {
      success: false,
      error: 'Device is offline.',
      timestamp: new Date()
    };
  }

  try {
    console.info('[SyncManager] Starting full incremental sync cycle...');
    setSyncState('Syncing');

    // Flush any pending queue mutations first
    await processQueue();

    const syncStartTime = new Date();

    // 1. Sync Settings (no dependencies)
    await syncTable('settings');

    // 2. Sync Projects (no dependencies)
    await syncTable('projects');

    // 3. Sync Habits (no dependencies)
    await syncTable('habits');

    // 4. Sync Tasks (depends on projects)
    await syncTable('tasks');

    // 5. Sync Time Entries (depends on projects)
    await syncTable('timeEntries');

    // 6. Sync Notes (no dependencies)
    await syncTable('notes');

    // 7. Sync Ideas (no dependencies)
    await syncTable('ideas');

    // 8. Sync Habit Logs (depends on habits)
    await syncTable('habitLogs');

    // 9. Sync Calendar Events (no dependencies)
    await syncTable('calendarEvents');

    // 10. Sync Health mode tables (no dependencies).
    // Wrapped so a missing remote table (migration not yet applied) doesn't
    // break sync for the core productivity tables.
    const healthTables = ['healthGoals', 'exerciseLogs', 'waterLogs', 'sleepLogs', 'dietLogs', 'weightLogs', 'stepLogs'];
    for (const t of healthTables) {
      try {
        await syncTable(t);
      } catch (err) {
        console.error(`[SyncManager] Health table "${t}" failed to sync (run supabase/migration_health.sql if tables are missing):`, err);
      }
    }


    // Update settings table with last successful sync time
    setBypassSoftDeleteMiddleware(true);
    try {
      // Ensure settings row exists before updating
      const settingsRow = await db.settings.get(1);
      if (settingsRow) {
        await db.settings.update(1, { lastSyncedAt: syncStartTime.toISOString() });
      } else {
        // Prefer whatever theme was last cached in localStorage over a
        // hardcoded default, so a settings row created here (e.g. after
        // local storage was cleared/evicted) doesn't silently flip an
        // already-chosen dark theme back to light.
        let cachedTheme: 'light' | 'dark' = 'light';
        try {
          const stored = localStorage.getItem('pace-theme');
          if (stored === 'dark' || stored === 'light') cachedTheme = stored;
        } catch {
          // ignore
        }
        await db.settings.put({
          id: 1,
          name: 'Saad',
          theme: cachedTheme,
          dogEnabled: true,
          tutorialSeen: false,
          lastSyncedAt: syncStartTime.toISOString()
        });
      }
    } finally {
      setBypassSoftDeleteMiddleware(false);
    }

    console.info('[SyncManager] Incremental sync cycle completed successfully.');
    setSyncState('Idle');

    return {
      success: true,
      timestamp: syncStartTime
    };
  } catch (err: any) {
    console.error('[SyncManager] Full sync cycle failed:', err);
    setSyncState('Error');
    return {
      success: false,
      error: err?.message || String(err),
      timestamp: new Date()
    };
  }
}
