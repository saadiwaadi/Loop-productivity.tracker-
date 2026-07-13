import { useState, useEffect } from 'react';
import { getSyncState, subscribeToSyncState, type SyncState } from '../db/queueManager';

/**
 * React hook to reactively subscribe to the sync engine's status.
 * Exposes: 'Idle' | 'Syncing' | 'Offline' | 'Waiting for Retry' | 'Conflict Resolved' | 'Error'
 */
export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(getSyncState());

  useEffect(() => {
    // Sync initial state
    setState(getSyncState());

    // Listen to changes from the sync engine
    const unsubscribe = subscribeToSyncState((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return state;
}
