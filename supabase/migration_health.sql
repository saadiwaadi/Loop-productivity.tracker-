-- Health Mode migration for Loop
-- Run this in the Supabase SQL editor to enable syncing of health data.
-- Safe to run multiple times (IF NOT EXISTS everywhere).

-- 1. EXERCISE LOGS
CREATE TABLE IF NOT EXISTS exercise_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('run', 'walk', 'gym', 'cycle', 'sport', 'yoga', 'swim', 'other')),
    duration_min INTEGER NOT NULL,
    intensity TEXT NOT NULL CHECK (intensity IN ('easy', 'moderate', 'hard')),
    calories INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_date ON exercise_logs(user_id, date);

-- 2. WATER LOGS
CREATE TABLE IF NOT EXISTS water_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_water_logs_user ON water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(user_id, date);

-- 3. SLEEP LOGS
CREATE TABLE IF NOT EXISTS sleep_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL, -- morning of wake-up
    bed_time TEXT NOT NULL, -- "HH:MM"
    wake_time TEXT NOT NULL, -- "HH:MM"
    duration_min INTEGER NOT NULL,
    quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 5),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user ON sleep_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs(user_id, date);

-- 4. DIET LOGS
CREATE TABLE IF NOT EXISTS diet_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    description TEXT NOT NULL,
    calories INTEGER,
    on_track BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_diet_logs_user ON diet_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_logs_date ON diet_logs(user_id, date);

-- 5. WEIGHT LOGS
CREATE TABLE IF NOT EXISTS weight_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs(user_id, date);

-- 6. STEP LOGS
CREATE TABLE IF NOT EXISTS step_logs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    date TEXT NOT NULL,
    steps INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_step_logs_user ON step_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_step_logs_date ON step_logs(user_id, date);

-- 7. HEALTH GOALS (singleton per user, id = 1)
CREATE TABLE IF NOT EXISTS health_goals (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id INTEGER NOT NULL DEFAULT 1,
    water_goal_ml INTEGER NOT NULL DEFAULT 2500,
    step_goal INTEGER NOT NULL DEFAULT 8000,
    sleep_goal_min INTEGER NOT NULL DEFAULT 480,
    exercise_weekly_min INTEGER NOT NULL DEFAULT 150,
    calorie_goal INTEGER,
    weight_goal_kg REAL,
    start_weight_kg REAL,
    diet_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_health_goals_user ON health_goals(user_id);

-- ROW LEVEL SECURITY
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_logs') THEN
    CREATE POLICY "Users own exercise_logs" ON exercise_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'water_logs') THEN
    CREATE POLICY "Users own water_logs" ON water_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sleep_logs') THEN
    CREATE POLICY "Users own sleep_logs" ON sleep_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet_logs') THEN
    CREATE POLICY "Users own diet_logs" ON diet_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weight_logs') THEN
    CREATE POLICY "Users own weight_logs" ON weight_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'step_logs') THEN
    CREATE POLICY "Users own step_logs" ON step_logs
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'health_goals') THEN
    CREATE POLICY "Users own health_goals" ON health_goals
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
