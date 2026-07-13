# Offline-First Synchronization Engine

This document details the architecture, data flows, and reliability mechanisms of the **Pace** production synchronization engine.

---

## 1. High-Level Architecture

The Pace dashboard follows a strict **local-first (offline-first)** database paradigm:

```
    React UI Components (useLiveQuery hooks)
                 ↓
      Dexie (Primary Database)
                 ↓ (DBCore Middleware Interceptor)
      Local State   →   Sync Queue (IndexedDB)
                             ↓
                     Supabase (Sync Layer)
```

1. **Dexie (IndexedDB)** is the single source of truth for the frontend UI.
2. **DBCore Middleware** intercepts all read/write queries globally to inject timestamp management, soft-delete rules, and append sync tasks to the persistent queue.
3. **Supabase** acts purely as a backup and multi-device synchronization layer. If Supabase is unreachable, the application continues to run normally with full feature capability.

---

## 2. Incremental Sync

To avoid downloading complete tables during sync cycles, Pace implements **incremental pull-and-push syncing**:
* The local database maintains a `syncMetadata` store tracking the `last_sync` timestamp for each table.
* **Pulls** only request rows from Supabase where `updated_at > last_sync`.
* **Pushes** only select local rows from Dexie where `updatedAt > last_sync`.
* Once a table's sync cycle finishes, the local `last_sync` timestamp is updated to the start time of the cycle.

---

## 3. Conflict Resolution

Synchronization operates on a deterministic **Latest-Updated-Wins** conflict resolution rule:
1. When pulling records, if a key collision occurs (a row exists both locally and remotely), the engine compares `local.updatedAt` and `remote.updated_at` timestamps.
2. If `remote.updated_at > local.updatedAt`, the local row is overwritten.
3. If `local.updatedAt > remote.updated_at`, the local row is kept. Since its timestamp is newer than `last_sync`, the local version will be pushed to Supabase.
4. Conflict resolution is performed automatically in background threads without blocking the user interface.

---

## 4. Soft Deletes

To prevent permanent data loss and allow deletions to propagate across devices, Pace uses **soft deletes**:
* When a deletion is triggered in the app (`db.table.delete(id)`), the DBCore middleware intercepts the mutation.
* It changes the operation from a `delete` to a `put` (update) that sets `deletedAt = now()`.
* Standard read operations (`get`, `getMany`, `query`, `count`, cursor iterations) automatically filter out rows where `deletedAt` is not null.
* Soft-deleted rows remain in local IndexedDB and are synced to Supabase (propagating `deleted_at = now()`).
* Pull operations replicate this by checking for `deletedAt` values, ensuring remote deletions hide corresponding local items.

---

## 5. Durable Sync Queue

When writes are executed locally, a sync task is transactionally logged to the `syncQueue` table within IndexedDB.

### Queue Recovery and Retries
* **Durable Queue**: The queue is stored in IndexedDB and survives browser reloads, browser crashes, or tab closures.
* **Exponential Backoff**: If an operation fails due to network loss, the engine pauses queue processing, increments the task's `attemptCount`, and schedules a retry using exponential backoff:
  $$\text{Delay} = \min(1000 \times 2^{\text{attempts}}, 30000)\text{ ms}$$
* **Network Status Gate**: The queue runner listens for browser `online` and `offline` events, pausing sync automatically when offline and triggering retries instantly upon reconnection.

---

## 6. Future Multi-Device Recommendations

To support scaling to multiple active devices, we recommend the following enhancements:
1. **Tombstone Cleanup**: Periodically purge records where `deletedAt < now() - 30 days` to prevent local database bloat.
2. **Conflict Merging**: For rich content fields (e.g., TipTap editor notes in JSON format), implement patch-based conflict resolution (diff/patch) instead of overwriting the entire file when timestamps differ.
3. **WebSockets (Real-time)**: Subscribe to Supabase realtime channels to trigger immediate pulling when remote changes occur on other devices.
