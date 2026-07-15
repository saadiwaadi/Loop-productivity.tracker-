import { type RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import db, { setBypassSoftDeleteMiddleware } from './db';
import { mapRemoteToLocal } from './sync';

let realtimeChannel: RealtimeChannel | null = null;

/**
 * Handle incoming Postgres change event payload from Supabase Realtime
 */
export async function handleRealtimePayload(payload: any) {
  const { table, eventType, new: newRow, old: oldRow } = payload;
  
  // Map Supabase snake_case table name to Dexie camelCase table name
  const tableMap: { [key: string]: string } = {
    projects: 'projects',
    tasks: 'tasks',
    time_entries: 'timeEntries',
    notes: 'notes',
    ideas: 'ideas',
    habits: 'habits',
    habit_logs: 'habitLogs',
    settings: 'settings',
  };

  const dexieTable = tableMap[table];
  if (!dexieTable) return;

  if (eventType === 'DELETE') {
    const id = oldRow?.id;
    if (id !== undefined) {
      setBypassSoftDeleteMiddleware(true);
      try {
        await db.table(dexieTable).delete(id);
      } finally {
        setBypassSoftDeleteMiddleware(false);
      }
    }
    return;
  }

  if (!newRow) return;

  // Map remote fields back to camelCase local item
  const remoteItem = mapRemoteToLocal(dexieTable, newRow);
  const localItem = await db.table(dexieTable).get(newRow.id);

  // Last-write-wins: compare local vs remote updatedAt
  const localUpdatedAt = localItem?.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
  const remoteUpdatedAt = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

  if (!localItem || remoteUpdatedAt > localUpdatedAt) {
    setBypassSoftDeleteMiddleware(true);
    try {
      await db.table(dexieTable).put(remoteItem);
    } finally {
      setBypassSoftDeleteMiddleware(false);
    }
  }
}

/**
 * Subscribes to Realtime updates for all tables scoped to the user_id
 */
export function subscribeToRealtime(userId: string) {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }

  const tables = ['projects', 'tasks', 'time_entries', 'notes', 'ideas', 'habits', 'habit_logs', 'settings'];

  realtimeChannel = supabase.channel('public-db-changes');

  for (const table of tables) {
    realtimeChannel = realtimeChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.info(`[Realtime] Received change for ${table}:`, payload);
        handleRealtimePayload(payload).catch((err) => {
          console.error(`[Realtime] Failed to apply change for ${table}:`, err);
        });
      }
    );
  }

  realtimeChannel.subscribe((status) => {
    console.info(`[Realtime] Subscription status: ${status}`);
  });
}

/**
 * Unsubscribes from Supabase Realtime channel
 */
export function unsubscribeFromRealtime() {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
}
