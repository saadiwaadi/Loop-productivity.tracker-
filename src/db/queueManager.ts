import db, { setBypassSoftDeleteMiddleware } from './db';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

export type SyncState = 'Idle' | 'Syncing' | 'Offline' | 'Waiting for Retry' | 'Conflict Resolved' | 'Error';

let currentState: SyncState = 'Idle';
const listeners = new Set<(state: SyncState) => void>();

export function setSyncState(state: SyncState) {
  currentState = state;
  listeners.forEach(fn => fn(state));
}

export function getSyncState(): SyncState {
  // If the browser reports offline, we override the returned status to 'Offline'
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Offline';
  }
  return currentState;
}

export function subscribeToSyncState(fn: (state: SyncState) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let isProcessing = false;
let retryTimeoutId: any = null;

/**
 * Maps camelCase local Dexie model to snake_case Supabase table columns
 */
export function mapLocalToRemote(table: string, val: any, userId: string) {
  const mapped: any = {
    user_id: userId,
    id: val.id
  };

  for (const key of Object.keys(val)) {
    if (key === 'id' || key === 'lastSyncedAt') continue;

    // Convert camelCase key to snake_case
    let snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (snakeKey === 'content_j_s_o_n') {
      snakeKey = 'content_json';
    }
    let value = val[key];

    if (value instanceof Date) {
      value = value.toISOString();
    } else if (value === undefined) {
      value = null;
    }

    // Special conversions
    if (table === 'timeEntries' && key === 'startedAt') {
      mapped.created_at = new Date(value).toISOString();
    }

    mapped[snakeKey] = value;
  }

  return mapped;
}

/**
 * Triggers queue execution
 */
export async function triggerQueueProcess() {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  await processQueue();
}

/**
 * Processes the persistent synchronization queue.
 * Performs sequential upsert updates to Supabase.
 */
export async function processQueue() {
  if (isProcessing) return;
  
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncState('Offline');
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    setSyncState('Idle');
    return;
  }

  isProcessing = true;
  setSyncState('Syncing');

  try {
    // 1. Fetch queue items ordered by ID
    const queueItems = await db.syncQueue.orderBy('id').toArray();
    if (queueItems.length === 0) {
      setSyncState('Idle');
      isProcessing = false;
      return;
    }

    console.info(`[QueueManager] Processing ${queueItems.length} queued mutations...`);

    for (const entry of queueItems) {
      // Check online status mid-loop
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncState('Offline');
        isProcessing = false;
        return;
      }

      // Fetch the actual record from Dexie (bypassing soft-delete filter to read deleted records too)
      setBypassSoftDeleteMiddleware(true);
      let localItem: any;
      try {
        localItem = await db.table(entry.table).get(entry.recordId);
      } finally {
        setBypassSoftDeleteMiddleware(false);
      }

      if (!localItem) {
        // Local record no longer exists (e.g. wiped). Skip and remove queue task
        await db.syncQueue.delete(entry.id!);
        continue;
      }

      // Map to Supabase columns
      const mapped = mapLocalToRemote(entry.table, localItem, user.id);
      
      // Determine Supabase table name (snake_case conversion of local table names)
      let supabaseTable = entry.table.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (supabaseTable === 'time_entries') {
        // Ensure proper started_at mappings
        mapped.started_at = localItem.startedAt;
        mapped.ended_at = localItem.endedAt || null;
      }

      // Perform upsert to Supabase
      const { error } = await supabase
        .from(supabaseTable)
        .upsert(mapped, { onConflict: 'user_id,id' });

      if (error) {
        console.error(`[QueueManager] Failed to sync ${entry.table} record ${entry.recordId}:`, error);
        
        // Calculate exponential backoff
        const attempt = entry.attemptCount + 1;
        await db.syncQueue.update(entry.id!, { attemptCount: attempt });
        
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.info(`[QueueManager] Scheduling retry in ${delay}ms...`);
        
        setSyncState('Waiting for Retry');
        
        retryTimeoutId = setTimeout(() => {
          retryTimeoutId = null;
          processQueue();
        }, delay);

        isProcessing = false;
        return; // Pause remaining queue execution to preserve ordering
      }

      // Success: Remove item from queue
      await db.syncQueue.delete(entry.id!);
    }

    setSyncState('Idle');
  } catch (err) {
    console.error('[QueueManager] Unexpected error during queue process:', err);
    setSyncState('Error');
  } finally {
    isProcessing = false;
  }
}

// Automatically bind window/browser online handlers if in browser context
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[Network] Browser online. Resuming sync...');
    triggerQueueProcess();
  });
  window.addEventListener('offline', () => {
    console.info('[Network] Browser offline. Pausing sync...');
    setSyncState('Offline');
  });
}
