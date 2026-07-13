-- Database schema for Pace Productivity Dashboard
-- Supports multi-user offline synchronization via composite keys and soft deletes

-- 1. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    icon TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'shipped', 'spec')),
    target_hours INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- 2. TASKS
CREATE TABLE IF NOT EXISTS tasks (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    project_id INTEGER,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    done_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, project_id) REFERENCES projects(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(user_id, project_id);

-- 3. TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    started_at BIGINT NOT NULL,
    ended_at BIGINT,
    source TEXT NOT NULL CHECK (source IN ('stopwatch', 'manual')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, project_id) REFERENCES projects(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(user_id, project_id);

-- 4. NOTES
CREATE TABLE IF NOT EXISTS notes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

-- 5. IDEAS
CREATE TABLE IF NOT EXISTS ideas (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_ideas_user ON ideas(user_id);

-- 6. HABITS
CREATE TABLE IF NOT EXISTS habits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color_token TEXT NOT NULL,
    icon TEXT NOT NULL,
    target_days_per_week INTEGER NOT NULL CHECK (target_days_per_week BETWEEN 1 AND 7),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- 7. HABIT LOGS
CREATE TABLE IF NOT EXISTS habit_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    habit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id, habit_id) REFERENCES habits(user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(user_id, habit_id);

-- 8. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')),
    dog_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tutorial_seen BOOLEAN NOT NULL DEFAULT FALSE,
    home_layout TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);

-- ROW LEVEL SECURITY (RLS) ENABLEMENT
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES
CREATE POLICY "Allow users all operations on their own projects" ON projects
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own tasks" ON tasks
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own time_entries" ON time_entries
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own notes" ON notes
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own ideas" ON ideas
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own habits" ON habits
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own habit_logs" ON habit_logs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users all operations on their own settings" ON settings
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
