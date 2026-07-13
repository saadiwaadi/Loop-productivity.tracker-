import db, { setBypassSoftDeleteMiddleware } from './db';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { mapLocalToRemote, setSyncState } from './queueManager';

/**
 * Maps remote snake_case database row back to local camelCase Dexie model
 */
export function mapRemoteToLocal(table: string, row: any) {
  const mapped: any = {
    id: row.id
  };

  for (const key of Object.keys(row)) {
    if (key === 'id' || key === 'user_id') continue;

    // Convert snake_case key to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = row[key];

    if (
      camelKey === 'createdAt' ||
      camelKey === 'updatedAt' ||
      camelKey === 'deletedAt' ||
      camelKey === 'doneAt' ||
      camelKey === 'dueAt' ||
      camelKey === 'archivedAt' ||
      camelKey === 'completedAt'
    ) {
      value = value ? new Date(value) : null;
    }

    // Special conversions
    if (table === 'timeEntries') {
      if (key === 'started_at') mapped.startedAt = Number(row.started_at);
      if (key === 'ended_at') mapped.endedAt = row.ended_at ? Number(row.ended_at) : null;
    }

    mapped[camelKey] = value;
  }

  // Ensure default structures are correct
  if (table === 'settings') {
    mapped.dogEnabled = row.dog_enabled;
    mapped.tutorialSeen = row.tutorial_seen;
    mapped.homeLayout = row.home_layout || undefined;
  }

  return mapped;
}

/**
 * Pulls incremental updates from Supabase for a given table
 */
export async function pullTable(tableName: string) {
  const user = await getCurrentUser();
  if (!user) return;

  // Retrieve last sync timestamp
  const metadataKey = `last_${tableName}_sync`;
  const metadata = await db.syncMetadata.get(metadataKey);
  const lastSync = metadata ? metadata.value : null;

  // Convert table name to snake_case for Supabase query
  const supabaseTable = tableName.replace(/([A-Z])/g, '_$1').toLowerCase();

  let query = supabase
    .from(supabaseTable)
    .select('*')
    .eq('user_id', user.id);

  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return;

  // We bypass the soft-delete/timestamp middleware during replication
  setBypassSoftDeleteMiddleware(true);
  try {
    await db.transaction('rw', db.table(tableName), async () => {
      for (const row of data) {
        const remoteItem = mapRemoteToLocal(tableName, row);
        const localItem = await db.table(tableName).get(row.id);

        if (!localItem) {
          // If it doesn't exist locally, insert it
          await db.table(tableName).put(remoteItem);
        } else {
          // Conflict Resolution: Latest updated_at wins
          const localUpdatedAt = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
          const remoteUpdatedAt = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

          if (remoteUpdatedAt > localUpdatedAt) {
            await db.table(tableName).put(remoteItem);
            setSyncState('Conflict Resolved');
          }
        }
      }
    });
  } finally {
    setBypassSoftDeleteMiddleware(false);
  }
}

/**
 * Pushes local updates (including soft-deletes) to Supabase in batches
 */
export async function pushTable(tableName: string) {
  const user = await getCurrentUser();
  if (!user) return;

  // Retrieve last sync timestamp
  const metadataKey = `last_${tableName}_sync`;
  const metadata = await db.syncMetadata.get(metadataKey);
  const lastSync = metadata ? new Date(metadata.value).getTime() : 0;

  // Fetch all local records (bypassing soft delete filter to see deletions too)
  setBypassSoftDeleteMiddleware(true);
  let localItems: any[] = [];
  try {
    localItems = await db.table(tableName).toArray();
  } finally {
    setBypassSoftDeleteMiddleware(false);
  }

  // Filter for records created or updated since the last sync
  const modifiedItems = localItems.filter(item => {
    const updatedAtTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    return updatedAtTime > lastSync;
  });

  if (modifiedItems.length === 0) return;

  const mapped = modifiedItems.map(item => {
    const val = mapLocalToRemote(tableName, item, user.id);
    if (tableName === 'timeEntries') {
      val.started_at = item.startedAt;
      val.ended_at = item.endedAt || null;
    }
    return val;
  });

  const supabaseTable = tableName.replace(/([A-Z])/g, '_$1').toLowerCase();

  // Batch upload to prevent multiple HTTP requests
  const { error } = await supabase
    .from(supabaseTable)
    .upsert(mapped, { onConflict: 'user_id,id' });

  if (error) throw error;
}

/**
 * Synchronizes a single table in both directions
 */
export async function syncTable(tableName: string, startTime: Date) {
  // 1. Pull remote updates first
  await pullTable(tableName);
  
  // 2. Push local updates second
  await pushTable(tableName);

  // 3. Update sync metadata timestamp
  const metadataKey = `last_${tableName}_sync`;
  await db.syncMetadata.put({
    key: metadataKey,
    value: startTime.toISOString()
  });
}

// compatibility wrapper exports for feature layer
export async function pushProjects() { await pushTable('projects'); }
export async function pullProjects() { await pullTable('projects'); }

export async function pushTasks() { await pushTable('tasks'); }
export async function pullTasks() { await pullTable('tasks'); }

export async function pushTimeEntries() { await pushTable('timeEntries'); }
export async function pullTimeEntries() { await pullTable('timeEntries'); }

export async function pushNotes() { await pushTable('notes'); }
export async function pullNotes() { await pullTable('notes'); }

export async function pushIdeas() { await pushTable('ideas'); }
export async function pullIdeas() { await pullTable('ideas'); }

export async function pushHabits() { await pushTable('habits'); }
export async function pullHabits() { await pullTable('habits'); }

export async function pushHabitLogs() { await pushTable('habitLogs'); }
export async function pullHabitLogs() { await pullTable('habitLogs'); }

export async function pushSettings() { await pushTable('settings'); }
export async function pullSettings() { await pullTable('settings'); }
