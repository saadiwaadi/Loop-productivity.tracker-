# Migration & Sync Integration Report

This report maps the existing database read/write access points inside the **Pace** dashboard codebase and identifies integration points for the Supabase synchronization layer.

---

## 1. Database Read Points (Dexie Queries)

These files subscribe to Dexie reactive data updates using `useLiveQuery` or direct `.toArray()` calls:

*   **`src/hooks/useDb.ts`**
    *   Subscribes to all data tables to provide global React state hooks (`useSettings`, `useProjects`, `useTasks`, `useNotes`, `useIdeas`, `useHabits`, `useHabitLogs`).
*   **`src/features/analyzer/AnalyzerView.tsx`**
    *   Reads projects, tasks, time entries, habits, and habit logs to render active statistics, graphs, and initiative maps.
*   **`src/features/home/HomeView.tsx`**
    *   Reads settings, projects, and tasks for bento layouts.
*   **`src/features/projects/ProjectsView.tsx`**
    *   Reads projects, tasks, and time entries.
*   **`src/features/notes/NotesView.tsx`**
    *   Reads active notes list and caught ideas.
*   **`src/features/habits/HabitsView.tsx`**
    *   Reads habits and completed daily habit logs.
*   **`src/components/TodayTasks.tsx`**
    *   Reads daily todo items.
*   **`src/components/SparksToday.tsx`**
    *   Reads raw product ideas.
*   **`src/components/LiveClock.tsx`**
    *   Reads current active focus timers and next task.
*   **`src/components/HabitsToday.tsx`**
    *   Reads habits and completions for today.
*   **`src/components/Dog.tsx`**
    *   Reads companion layout settings.
*   **`src/components/CommandPalette.tsx`**
    *   Reads search targets (projects, tasks, habits).

---

## 2. Database Write Points (Dexie Mutators)

These files modify, add, or delete items in the local IndexedDB database:

*   **`src/features/settings/SettingsView.tsx`**
    *   Updates name, theme, companion toggles.
    *   Clears and repopulates database tables during backup restoring.
*   **`src/features/projects/ProjectsView.tsx`**
    *   Adds/deletes/updates project names, targets, and logs.
*   **`src/features/notes/NotesView.tsx`**
    *   Adds/deletes notes, edits note editor JSON content, captures new ideas.
*   **`src/features/habits/HabitsView.tsx`**
    *   Creates and deletes habits.
*   **`src/features/home/HomeView.tsx`**
    *   Saves bento drag-and-drop ordering configurations.
*   **`src/components/TodayTasks.tsx`**
    *   Toggles tasks (done/todo), creates tasks, edits titles.
*   **`src/components/ThemeToggle.tsx`**
    *   Toggles theme (light/dark) in settings.
*   **`src/components/SparksToday.tsx`**
    *   Quick-inserts ideas, converts ideas to tasks.
*   **`src/components/LiveClock.tsx`**
    *   Starts stopwatch, logs new time entries.
*   **`src/components/HabitsToday.tsx`**
    *   Checks off / logs daily habits.
*   **`src/components/CommandPalette.tsx`**
    *   Toggles mascot companion enabled state.
*   **`src/components/ActiveSession.tsx`**
    *   Starts, pauses, resets, or manually saves time logs.

---

## 3. Recommended Integration Points for Sync

Since the application maintains an **offline-first** design where Dexie acts as the primary data store and UI source of truth, we recommend the following non-blocking integration points:

### Option A: Trigger on Application Boot & Auth State Changes
Call `syncAll()` when the user logs in, logs out, or when the application boots up.
```typescript
import { supabase } from './lib/supabase';
import { syncAll } from './db/syncManager';

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') {
    syncAll();
  }
});
```

### Option B: Trigger on Write Events (Debounced / Lazy Sync)
To keep the cloud database updated as the user makes local changes without blocking the UI:
1. Wrap Dexie writes with a debounced callback to `syncAll()`.
2. This ensures that a few seconds after a user finishes editing, their changes are automatically backed up to Supabase.

### Option C: Manual Sync Button
Place a "Sync with Cloud" status indicator and manual trigger button inside `SettingsView.tsx` so users can see their last sync timestamp and trigger a sync at will.
