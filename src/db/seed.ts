import { type PaceDatabase } from './db';

export async function seedDemoData(db: PaceDatabase) {
  // 1. Settings Singleton
  await db.settings.put({
    id: 1,
    name: 'Saad',
    theme: 'light',
    dogEnabled: true,
    tutorialSeen: false,
  });

  // 2. Sample Projects
  const projectId1 = await db.projects.add({
    name: 'Cheema POS',
    colorToken: '--violet',
    icon: 'LayoutGrid',
    status: 'active',
    targetHours: 40,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  });

  const projectId2 = await db.projects.add({
    name: 'River View ERP',
    colorToken: '--sky',
    icon: 'Database',
    status: 'active',
    targetHours: 60,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
  });

  await db.projects.add({
    name: 'Portfolio Site',
    colorToken: '--coral',
    icon: 'Globe',
    status: 'spec',
    targetHours: 15,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
  });

  // 3. Handful of Tasks
  await db.tasks.bulkAdd([
    {
      projectId: projectId1,
      title: 'Design database schemas',
      done: true,
      doneAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: projectId1,
      title: 'Setup Vite + React scaffold',
      done: true,
      doneAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: projectId1,
      title: 'Implement time entry tracking hooks',
      done: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: projectId2,
      title: 'Write project review document',
      done: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: null, // Standalone task
      title: 'Draft personal bio for portfolio about section',
      done: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  // 4. Sample Time Entries (historically logged focus hours)
  const now = Date.now();
  await db.timeEntries.bulkAdd([
    {
      projectId: projectId1,
      startedAt: now - 3 * 60 * 60 * 1000, // 3 hours ago
      endedAt: now - 1 * 60 * 60 * 1000,   // ended 1 hour ago (2h logged)
      source: 'stopwatch',
      note: 'Database configuration work',
    },
    {
      projectId: projectId2,
      startedAt: now - 25 * 60 * 60 * 1000, // 25 hours ago
      endedAt: now - 22 * 60 * 60 * 1000,   // ended 22 hours ago (3h logged)
      source: 'manual',
      note: 'Client sync-up and design discussion',
    },
  ]);

  // 5. Sample Habits
  const habitId1 = await db.habits.add({
    name: 'Deep Work',
    colorToken: '--violet',
    icon: 'Clock',
    targetDaysPerWeek: 4,
  });

  const habitId2 = await db.habits.add({
    name: 'Gym',
    colorToken: '--coral',
    icon: 'Flame',
    targetDaysPerWeek: 3,
  });

  await db.habits.add({
    name: 'Read',
    colorToken: '--mint',
    icon: 'BookOpen',
    targetDaysPerWeek: 5,
  });

  // 6. Habit Logs for Streak Calculation (last few days completion logs)
  const formatDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Add completions for Deep Work: logged 4 times in the past 6 days
  await db.habitLogs.bulkAdd([
    { habitId: habitId1, date: formatDate(0), completedAt: new Date() },
    { habitId: habitId1, date: formatDate(1), completedAt: new Date() },
    { habitId: habitId1, date: formatDate(3), completedAt: new Date() },
    { habitId: habitId1, date: formatDate(4), completedAt: new Date() },
    // Add completions for Gym: logged 3 times
    { habitId: habitId2, date: formatDate(1), completedAt: new Date() },
    { habitId: habitId2, date: formatDate(3), completedAt: new Date() },
    { habitId: habitId2, date: formatDate(5), completedAt: new Date() },
  ]);

  // 7. Sample Notes
  await db.notes.add({
    title: 'Workspace setup notes',
    contentJSON: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Calm and focused workspace' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Keep browser tabs under 5, play ambient lofi, log only completed items in the POS. Biscuit will sit on the side and cheer you on.',
            },
          ],
        },
      ],
    },
    updatedAt: new Date(),
    createdAt: new Date(),
  });

  // 8. Sample Ideas
  await db.ideas.bulkAdd([
    {
      tag: 'App',
      title: 'Calm Space Audio',
      body: 'Generative ambient soundscapes based on task focus levels and active timers.',
      createdAt: new Date(),
    },
    {
      tag: 'Product',
      title: 'Minimal Mechanical Numpad',
      body: 'Dedicated focus key accessory with hot-swappable tactile switches.',
      createdAt: new Date(),
    },
  ]);
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
