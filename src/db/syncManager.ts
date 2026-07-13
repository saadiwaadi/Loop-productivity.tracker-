import { syncTable } from './sync';
import { getCurrentUser } from '../lib/auth';
import { setSyncState } from './queueManager';

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

    const syncStartTime = new Date();

    // 1. Sync Settings (no dependencies)
    await syncTable('settings', syncStartTime);

    // 2. Sync Projects (no dependencies)
    await syncTable('projects', syncStartTime);

    // 3. Sync Habits (no dependencies)
    await syncTable('habits', syncStartTime);

    // 4. Sync Tasks (depends on projects)
    await syncTable('tasks', syncStartTime);

    // 5. Sync Time Entries (depends on projects)
    await syncTable('timeEntries', syncStartTime);

    // 6. Sync Notes (no dependencies)
    await syncTable('notes', syncStartTime);

    // 7. Sync Ideas (no dependencies)
    await syncTable('ideas', syncStartTime);

    // 8. Sync Habit Logs (depends on habits)
    await syncTable('habitLogs', syncStartTime);

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
