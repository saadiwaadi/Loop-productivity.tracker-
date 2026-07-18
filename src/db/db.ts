import Dexie, { type Table } from 'dexie';
import { seedDemoData } from './seed';

export interface Project {
  id?: number;
  name: string;
  colorToken: string; // One of CSS var names like "--violet"
  icon: string; // Lucide icon name string
  status: 'active' | 'paused' | 'shipped' | 'spec';
  targetHours?: number;
  goalType?: 'hours' | 'tasks' | 'manual';
  targetTasks?: number;
  manualProgress?: number;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  notes?: string;
}

export interface Task {
  id?: number;
  projectId?: number | null; // Nullable FK (null = standalone task)
  title: string;
  done: boolean;
  crossedOff?: boolean;
  doneAt?: Date | null;
  dueAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface TimeEntry {
  id?: number;
  projectId: number; // FK
  startedAt: number; // Timestamp (milliseconds)
  endedAt: number | null; // Nullable timestamp (null = running)
  source: 'stopwatch' | 'manual';
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  pausedAt?: number | null;
}

export interface Note {
  id?: number;
  title: string;
  contentJSON: any; // TipTap JSON object
  updatedAt: Date;
  createdAt: Date;
  deletedAt?: Date | null;
  archived?: boolean;
  archivedAt?: Date | null;
  locked?: boolean;
}

export interface Idea {
  id?: number;
  tag: 'Film' | 'Brand' | 'App' | 'Product' | string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface Habit {
  id?: number;
  name: string;
  colorToken: string;
  icon: string;
  targetDaysPerWeek: number; // 1-7
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface HabitLog {
  id?: number;
  habitId: number; // FK
  date: string; // "YYYY-MM-DD"
  completedAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface Settings {
  id: number; // Fixed at 1
  name: string;
  theme: 'light' | 'dark';
  dogEnabled: boolean;
  tutorialSeen: boolean;
  homeLayout?: string[];
  updatedAt?: Date;
  deletedAt?: Date | null;
  lastSyncedAt?: string;
  notesPin?: string;
  // Local-only (excluded from sync): which app mode this device is showing
  mode?: 'productivity' | 'health';
}

export interface CalendarEvent {
  id?: number;
  title: string;
  date: string; // YYYY-MM-DD
  category: 'work' | 'personal' | 'education' | 'limited';
  colorToken: string; // one of CSS variables
  startTime?: string | null;
  endTime?: string | null;
  isLimited: boolean;
  limitedEndsAt?: string | null;
  reminder: boolean;
  note?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface SyncMetadata {
  key: string; // e.g. last_projects_sync
  value: string; // ISO date string
}

export interface SyncQueueEntry {
  id?: number;
  table: string;
  operation: 'upsert';
  recordId: number | string;
  attemptCount: number;
  createdAt: Date;
}

export interface CheckIn {
  id?: number;
  startedAt: number; // Timestamp (milliseconds)
  endedAt: number | null; // Nullable timestamp (null = currently checked in)
  createdAt: Date;
}

/* ============ HEALTH MODE TABLES ============ */

export interface ExerciseLog {
  id?: number;
  date: string; // YYYY-MM-DD
  name: string;
  kind: 'run' | 'walk' | 'gym' | 'cycle' | 'sport' | 'yoga' | 'swim' | 'other';
  durationMin: number;
  intensity: 'easy' | 'moderate' | 'hard';
  calories?: number | null;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface WaterLog {
  id?: number;
  date: string; // YYYY-MM-DD
  amountMl: number; // each row is one pour/glass
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface SleepLog {
  id?: number;
  date: string; // YYYY-MM-DD of the wake-up morning
  bedTime: string; // "HH:MM" (24h)
  wakeTime: string; // "HH:MM" (24h)
  durationMin: number;
  quality: 1 | 2 | 3 | 4 | 5;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface DietLog {
  id?: number;
  date: string; // YYYY-MM-DD
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories?: number | null;
  onTrack: boolean; // did it match the dietary goals?
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface StepLog {
  id?: number;
  date: string; // YYYY-MM-DD — one record per day
  steps: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface HealthGoals {
  id: number; // Fixed at 1 (singleton, like Settings)
  waterGoalMl: number;
  stepGoal: number;
  sleepGoalMin: number;
  exerciseWeeklyMin: number; // target active minutes per week
  calorieGoal?: number | null;
  weightGoalKg?: number | null;
  startWeightKg?: number | null;
  dietNotes?: string | null; // free-text dietary guidelines to check meals against
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export let bypassSoftDeleteMiddleware = false;

export function setBypassSoftDeleteMiddleware(bypass: boolean) {
  bypassSoftDeleteMiddleware = bypass;
}

export class PaceDatabase extends Dexie {
  projects!: Table<Project>;
  tasks!: Table<Task>;
  timeEntries!: Table<TimeEntry>;
  notes!: Table<Note>;
  ideas!: Table<Idea>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  settings!: Table<Settings>;
  syncMetadata!: Table<SyncMetadata>;
  syncQueue!: Table<SyncQueueEntry>;
  checkIns!: Table<CheckIn>;
  calendarEvents!: Table<CalendarEvent>;
  exerciseLogs!: Table<ExerciseLog>;
  waterLogs!: Table<WaterLog>;
  sleepLogs!: Table<SleepLog>;
  dietLogs!: Table<DietLog>;
  weightLogs!: Table<WeightLog>;
  stepLogs!: Table<StepLog>;
  healthGoals!: Table<HealthGoals>;

  constructor() {
    super('PaceDB');

    // Keep version 1 schema intact for migration compatibility
    this.version(1).stores({
      projects: '++id, name, status, createdAt',
      tasks: '++id, projectId, done, dueAt, createdAt',
      timeEntries: '++id, projectId, startedAt, endedAt',
      notes: '++id, title, updatedAt, createdAt',
      ideas: '++id, tag, title, createdAt',
      habits: '++id, name, archivedAt',
      habitLogs: '++id, habitId, date, [habitId+date]',
      settings: 'id',
    });

    // Version 2 schema: Add updatedAt/deletedAt indexes and metadata/queue tables
    this.version(2).stores({
      projects: '++id, name, status, createdAt, updatedAt, deletedAt',
      tasks: '++id, projectId, done, dueAt, createdAt, updatedAt, deletedAt',
      timeEntries: '++id, projectId, startedAt, endedAt, updatedAt, deletedAt',
      notes: '++id, title, updatedAt, createdAt, deletedAt',
      ideas: '++id, tag, title, createdAt, updatedAt, deletedAt',
      habits: '++id, name, archivedAt, createdAt, updatedAt, deletedAt',
      habitLogs: '++id, habitId, date, [habitId+date], updatedAt, deletedAt',
      settings: 'id, updatedAt, deletedAt',
      syncMetadata: 'key',
      syncQueue: '++id, table, operation, recordId'
    });

    this.version(3).stores({
      projects: '++id, name, status, createdAt, updatedAt, deletedAt',
      tasks: '++id, projectId, done, dueAt, createdAt, updatedAt, deletedAt',
      timeEntries: '++id, projectId, startedAt, endedAt, updatedAt, deletedAt',
      notes: '++id, title, updatedAt, createdAt, deletedAt',
      ideas: '++id, tag, title, createdAt, updatedAt, deletedAt',
      habits: '++id, name, archivedAt, createdAt, updatedAt, deletedAt',
      habitLogs: '++id, habitId, date, [habitId+date], updatedAt, deletedAt',
      settings: 'id, updatedAt, deletedAt',
      syncMetadata: 'key',
      syncQueue: '++id, table, operation, recordId',
      checkIns: '++id, startedAt, endedAt, createdAt'
    });

    this.version(4).stores({
      projects: '++id, name, status, createdAt, updatedAt, deletedAt',
      tasks: '++id, projectId, done, dueAt, createdAt, updatedAt, deletedAt',
      timeEntries: '++id, projectId, startedAt, endedAt, updatedAt, deletedAt',
      notes: '++id, title, updatedAt, createdAt, deletedAt',
      ideas: '++id, tag, title, createdAt, updatedAt, deletedAt',
      habits: '++id, name, archivedAt, createdAt, updatedAt, deletedAt',
      habitLogs: '++id, habitId, date, [habitId+date], updatedAt, deletedAt',
      settings: 'id, updatedAt, deletedAt',
      syncMetadata: 'key',
      syncQueue: '++id, table, operation, recordId',
      checkIns: '++id, startedAt, endedAt, createdAt'
    });

    this.version(5).stores({
      projects: '++id, name, status, createdAt, updatedAt, deletedAt',
      tasks: '++id, projectId, done, dueAt, createdAt, updatedAt, deletedAt',
      timeEntries: '++id, projectId, startedAt, endedAt, updatedAt, deletedAt',
      notes: '++id, title, updatedAt, createdAt, deletedAt',
      ideas: '++id, tag, title, createdAt, updatedAt, deletedAt',
      habits: '++id, name, archivedAt, createdAt, updatedAt, deletedAt',
      habitLogs: '++id, habitId, date, [habitId+date], updatedAt, deletedAt',
      settings: 'id, updatedAt, deletedAt',
      syncMetadata: 'key',
      syncQueue: '++id, table, operation, recordId',
      checkIns: '++id, startedAt, endedAt, createdAt',
      calendarEvents: '++id, title, date, category, createdAt, updatedAt, deletedAt'
    });

    // Version 6: Health mode tables
    this.version(6).stores({
      projects: '++id, name, status, createdAt, updatedAt, deletedAt',
      tasks: '++id, projectId, done, dueAt, createdAt, updatedAt, deletedAt',
      timeEntries: '++id, projectId, startedAt, endedAt, updatedAt, deletedAt',
      notes: '++id, title, updatedAt, createdAt, deletedAt',
      ideas: '++id, tag, title, createdAt, updatedAt, deletedAt',
      habits: '++id, name, archivedAt, createdAt, updatedAt, deletedAt',
      habitLogs: '++id, habitId, date, [habitId+date], updatedAt, deletedAt',
      settings: 'id, updatedAt, deletedAt',
      syncMetadata: 'key',
      syncQueue: '++id, table, operation, recordId',
      checkIns: '++id, startedAt, endedAt, createdAt',
      calendarEvents: '++id, title, date, category, createdAt, updatedAt, deletedAt',
      exerciseLogs: '++id, date, kind, createdAt, updatedAt, deletedAt',
      waterLogs: '++id, date, createdAt, updatedAt, deletedAt',
      sleepLogs: '++id, date, createdAt, updatedAt, deletedAt',
      dietLogs: '++id, date, meal, createdAt, updatedAt, deletedAt',
      weightLogs: '++id, date, createdAt, updatedAt, deletedAt',
      stepLogs: '++id, date, createdAt, updatedAt, deletedAt',
      healthGoals: 'id, updatedAt, deletedAt'
    });

    // Populate seed data on first creation
    this.on('populate', () => {
      seedDemoData(this);
    });

    // Register DBCore Middleware for Soft Deletes, Timestamps, and Sync Queuing
    this.use({
      stack: 'dbcore',
      name: 'SoftDeleteAndSyncMiddleware',
      create(downlevelDatabase) {
        return {
          ...downlevelDatabase,
          table(tableName) {
            const table = downlevelDatabase.table(tableName);

            // Skip helper tables and local-only tables to prevent circular updates and sync queuing
            if (tableName === 'syncQueue' || tableName === 'syncMetadata' || tableName === 'checkIns') {
              return table;
            }

            return {
              ...table,

              // Intercept single reads
              async get(req) {
                const res = await table.get(req);
                if (!bypassSoftDeleteMiddleware && res && res.deletedAt) {
                  return undefined;
                }
                return res;
              },

              // Intercept bulk reads
              async getMany(req) {
                const results = await table.getMany(req);
                if (bypassSoftDeleteMiddleware) return results;
                return results.map(res => (res && res.deletedAt ? undefined : res));
              },

              // Intercept queries (exclude soft deleted records)
              async query(req) {
                const res = await table.query(req);
                if (bypassSoftDeleteMiddleware) return res;
                res.result = (res.result || []).filter((row: any) => !row.deletedAt);
                return res;
              },

              // Intercept count (exclude soft deleted records)
              async count(req) {
                if (bypassSoftDeleteMiddleware) return table.count(req);
                const res = await table.query({
                  trans: req.trans,
                  values: true,
                  query: req.query
                });
                return (res.result || []).filter((row: any) => !row.deletedAt).length;
              },

              // Intercept cursor iteration (exclude soft deleted records)
              async openCursor(req) {
                const cursor = await table.openCursor(req);
                if (!cursor || bypassSoftDeleteMiddleware) return cursor;

                return {
                  trans: cursor.trans,
                  get key() { return cursor.key; },
                  get primaryKey() { return cursor.primaryKey; },
                  get value() { return cursor.value; },
                  get done() { return cursor.done; },
                  continue(key?: any) { cursor.continue(key); },
                  continuePrimaryKey(key: any, primaryKey: any) { cursor.continuePrimaryKey(key, primaryKey); },
                  advance(count: number) { cursor.advance(count); },
                  stop(value?: any) { cursor.stop(value); },
                  fail(err: Error) { cursor.fail(err); },
                  next() { return cursor.next(); },
                  start(onNext: () => void) {
                    return cursor.start(() => {
                      if (!cursor.done && cursor.value && cursor.value.deletedAt) {
                        cursor.continue();
                      } else {
                        onNext();
                      }
                    });
                  }
                } as any;
              },

              // Intercept write mutations (inject timestamps and sync queue records)
              async mutate(req) {
                const now = new Date();

                // If sync engine is bypassing, proceed natively
                if (bypassSoftDeleteMiddleware) {
                  return table.mutate(req);
                }

                // Add or edit operations
                if (req.type === 'add' || req.type === 'put') {
                  req.values = req.values.map(val => {
                    const copy = { ...val };
                    if (!copy.createdAt) {
                      copy.createdAt = now;
                    }
                    copy.updatedAt = now;
                    if (copy.deletedAt === undefined) {
                      copy.deletedAt = null;
                    }
                    return copy;
                  });

                  const res = await table.mutate(req);
                  const keys = req.keys || res.results || [];

                  // Transactionally add mutations to the persistent queue asynchronously
                  const queueItems = keys.map((key) => ({
                    table: tableName,
                    operation: 'upsert' as const,
                    recordId: key,
                    attemptCount: 0,
                    createdAt: now
                  }));

                  if (queueItems.length > 0) {
                    setTimeout(async () => {
                      try {
                        await db.syncQueue.bulkAdd(queueItems);
                        const { triggerQueueProcess } = await import('./queueManager');
                        triggerQueueProcess();
                      } catch (err) {
                        console.error('[Middleware] Failed to append to syncQueue:', err);
                      }
                    }, 0);
                  }

                  return res;
                }

                // Convert deletes into soft-deletes (put with deletedAt timestamp)
                if (req.type === 'delete') {
                  const existing = await table.getMany({
                    trans: req.trans,
                    keys: req.keys
                  });

                  const puts: any[] = [];
                  for (let i = 0; i < existing.length; i++) {
                    const obj = existing[i];
                    if (obj) {
                      puts.push({
                        ...obj,
                        deletedAt: now,
                        updatedAt: now
                      });
                    }
                  }

                  if (puts.length > 0) {
                    // Update locally with deletedAt timestamp
                    await table.mutate({
                      type: 'put',
                      trans: req.trans,
                      values: puts
                    });

                    // Add to sync queue as an upsert (so soft-delete state is synced)
                    const queueItems = req.keys.map((key) => ({
                      table: tableName,
                      operation: 'upsert' as const,
                      recordId: key,
                      attemptCount: 0,
                      createdAt: now
                    }));

                    setTimeout(async () => {
                      try {
                        await db.syncQueue.bulkAdd(queueItems);
                        const { triggerQueueProcess } = await import('./queueManager');
                        triggerQueueProcess();
                      } catch (err) {
                        console.error('[Middleware] Failed to append delete to syncQueue:', err);
                      }
                    }, 0);
                  }

                  return {
                    numFailures: 0,
                    failures: {},
                    lastResult: undefined
                  };
                }

                // Convert deleteRange into soft-deletes
                if (req.type === 'deleteRange') {
                  const res = await table.query({
                    trans: req.trans,
                    values: true,
                    query: {
                      index: table.schema.primaryKey,
                      range: req.range
                    }
                  });

                  const puts = (res.result || []).map((row: any) => ({
                    ...row,
                    deletedAt: now,
                    updatedAt: now
                  }));

                  if (puts.length > 0) {
                    await table.mutate({
                      type: 'put',
                      trans: req.trans,
                      values: puts
                    });

                    // Add to sync queue
                    const queueItems = puts.map((p: any) => ({
                      table: tableName,
                      operation: 'upsert' as const,
                      recordId: p.id,
                      attemptCount: 0,
                      createdAt: now
                    }));

                    setTimeout(async () => {
                      try {
                        await db.syncQueue.bulkAdd(queueItems);
                        const { triggerQueueProcess } = await import('./queueManager');
                        triggerQueueProcess();
                      } catch (err) {
                        console.error('[Middleware] Failed to append deleteRange to syncQueue:', err);
                      }
                    }, 0);
                  }

                  return {
                    numFailures: 0,
                    failures: {},
                    lastResult: undefined
                  };
                }

                return table.mutate(req);
              }
            };
          }
        };
      }
    });
  }
}

export const db = new PaceDatabase();
export default db;
