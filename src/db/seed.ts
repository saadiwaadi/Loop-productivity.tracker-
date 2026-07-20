import { type PaceDatabase } from './db';

/**
 * Runs once, only when a brand-new (empty) local database is created —
 * Dexie's `populate` hook. It used to also insert placeholder demo
 * projects/tasks/habits/notes ("Cheema POS", "Deep Work", etc). Those kept
 * resurfacing after being deleted whenever the local IndexedDB got
 * recreated (browser storage eviction, PWA reinstall, new device/browser
 * profile) — each recreation reseeded the same placeholders and pushed
 * them back up through sync. A real synced productivity app shouldn't
 * auto-inject sample content a user then has to keep deleting, so this
 * now only creates the required settings singleton.
 */
export async function seedDemoData(db: PaceDatabase) {
  await db.settings.put({
    id: 1,
    name: 'Saad',
    theme: 'light',
    dogEnabled: true,
    tutorialSeen: false,
  });
}

export async function clearAllData(db: PaceDatabase) {
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
}
