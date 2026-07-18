import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { HealthGoals } from '../db/db';
import { getDateString, getStartOfWeek } from '../utils/date';

export const DEFAULT_HEALTH_GOALS: HealthGoals = {
  id: 1,
  waterGoalMl: 2500,
  stepGoal: 8000,
  sleepGoalMin: 480,
  exerciseWeeklyMin: 150,
  calorieGoal: null,
  weightGoalKg: null,
  startWeightKg: null,
  dietNotes: null,
};

/** Health goals singleton — returns defaults until the row exists. */
export function useHealthGoals(): HealthGoals {
  return useLiveQuery(() => db.healthGoals.get(1)) ?? DEFAULT_HEALTH_GOALS;
}

export async function saveHealthGoals(patch: Partial<HealthGoals>) {
  const existing = await db.healthGoals.get(1);
  if (existing) {
    await db.healthGoals.update(1, patch);
  } else {
    await db.healthGoals.put({ ...DEFAULT_HEALTH_GOALS, ...patch, id: 1 });
  }
}

/** Returns the list of YYYY-MM-DD strings for the last N days, oldest first. */
export function lastNDates(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(from.getDate() - i);
    out.push(getDateString(d));
  }
  return out;
}

export function todayStr(): string {
  return getDateString(new Date());
}

/* ---------- Water ---------- */

export function useWaterToday() {
  return useLiveQuery(async () => {
    const logs = await db.waterLogs.where('date').equals(todayStr()).toArray();
    return logs.reduce((s, l) => s + l.amountMl, 0);
  }) ?? 0;
}

export function useWaterByDay(days: number) {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const logs = await db.waterLogs.where('date').anyOf(dates).toArray();
    return dates.map(date => ({
      date,
      totalMl: logs.filter(l => l.date === date).reduce((s, l) => s + l.amountMl, 0),
    }));
  }, [days]) ?? [];
}

export async function logWater(amountMl: number) {
  await db.waterLogs.add({ date: todayStr(), amountMl });
}

/* ---------- Steps ---------- */

export function useStepsToday() {
  return useLiveQuery(async () => {
    const logs = await db.stepLogs.where('date').equals(todayStr()).toArray();
    return logs.length > 0 ? logs[0].steps : 0;
  }) ?? 0;
}

export function useStepsByDay(days: number) {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const logs = await db.stepLogs.where('date').anyOf(dates).toArray();
    return dates.map(date => ({
      date,
      steps: logs.find(l => l.date === date)?.steps ?? 0,
    }));
  }, [days]) ?? [];
}

/** One record per day — updates in place if today already has a count. */
export async function logSteps(steps: number, date: string = todayStr()) {
  const existing = await db.stepLogs.where('date').equals(date).first();
  if (existing) {
    await db.stepLogs.update(existing.id!, { steps });
  } else {
    await db.stepLogs.add({ date, steps });
  }
}

/* ---------- Exercise ---------- */

export function useExerciseLogs(days: number) {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const logs = await db.exerciseLogs.where('date').anyOf(dates).toArray();
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [days]) ?? [];
}

export function useExerciseWeekMinutes() {
  return useLiveQuery(async () => {
    const monday = getStartOfWeek(new Date());
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(getDateString(d));
    }
    const logs = await db.exerciseLogs.where('date').anyOf(dates).toArray();
    return logs.reduce((s, l) => s + l.durationMin, 0);
  }) ?? 0;
}

/* ---------- Sleep ---------- */

export function useSleepLogs(days: number) {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const logs = await db.sleepLogs.where('date').anyOf(dates).toArray();
    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }, [days]) ?? [];
}

export function useSleepLastNight() {
  return useLiveQuery(async () => {
    return await db.sleepLogs.where('date').equals(todayStr()).first();
  });
}

/** Compute duration in minutes from "HH:MM" bed and wake times (handles crossing midnight). */
export function sleepDuration(bedTime: string, wakeTime: string): number {
  const [bh, bm] = bedTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

/* ---------- Diet ---------- */

export function useDietLogs(days: number) {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const logs = await db.dietLogs.where('date').anyOf(dates).toArray();
    return logs.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }, [days]) ?? [];
}

/* ---------- Weight ---------- */

export function useWeightLogs() {
  return useLiveQuery(async () => {
    const logs = await db.weightLogs.toArray();
    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }) ?? [];
}

/* ---------- Report / consistency ---------- */

export interface HealthReport {
  days: number;
  // weight
  firstWeight: number | null;
  lastWeight: number | null;
  weightDeltaKg: number | null;
  toGoalKg: number | null;
  // consistency: fraction of days [0..1] with a log / goal hit
  waterDaysHit: number;
  stepDaysHit: number;
  sleepDaysLogged: number;
  sleepAvgMin: number;
  exerciseDays: number;
  exerciseTotalMin: number;
  dietOnTrackPct: number | null;
  loggedAnyDays: number;
  consistencyPct: number;
  bestStreak: number;
}

/** Aggregated report over the last N days, used by the Report view. */
export function useHealthReport(days: number): HealthReport | undefined {
  return useLiveQuery(async () => {
    const dates = lastNDates(days);
    const goals = (await db.healthGoals.get(1)) ?? DEFAULT_HEALTH_GOALS;

    const [water, steps, sleep, exercise, diet, weights] = await Promise.all([
      db.waterLogs.where('date').anyOf(dates).toArray(),
      db.stepLogs.where('date').anyOf(dates).toArray(),
      db.sleepLogs.where('date').anyOf(dates).toArray(),
      db.exerciseLogs.where('date').anyOf(dates).toArray(),
      db.dietLogs.where('date').anyOf(dates).toArray(),
      db.weightLogs.toArray(),
    ]);

    const sortedWeights = weights.sort((a, b) => a.date.localeCompare(b.date));
    const inRangeWeights = sortedWeights.filter(w => dates.includes(w.date));
    const firstWeight = inRangeWeights[0]?.weightKg ?? sortedWeights[0]?.weightKg ?? null;
    const lastWeight = sortedWeights[sortedWeights.length - 1]?.weightKg ?? null;
    const weightDeltaKg = firstWeight !== null && lastWeight !== null
      ? +(lastWeight - firstWeight).toFixed(1) : null;
    const toGoalKg = lastWeight !== null && goals.weightGoalKg
      ? +(lastWeight - goals.weightGoalKg).toFixed(1) : null;

    let waterDaysHit = 0, stepDaysHit = 0, exerciseDays = 0, loggedAnyDays = 0;
    let bestStreak = 0, curStreak = 0;

    for (const date of dates) {
      const waterMl = water.filter(l => l.date === date).reduce((s, l) => s + l.amountMl, 0);
      const daySteps = steps.find(l => l.date === date)?.steps ?? 0;
      const dayExercise = exercise.some(l => l.date === date);
      const anyLog = waterMl > 0 || daySteps > 0 || dayExercise ||
        sleep.some(l => l.date === date) || diet.some(l => l.date === date);

      if (waterMl >= goals.waterGoalMl) waterDaysHit++;
      if (daySteps >= goals.stepGoal) stepDaysHit++;
      if (dayExercise) exerciseDays++;
      if (anyLog) {
        loggedAnyDays++;
        curStreak++;
        bestStreak = Math.max(bestStreak, curStreak);
      } else {
        curStreak = 0;
      }
    }

    const sleepAvgMin = sleep.length > 0
      ? Math.round(sleep.reduce((s, l) => s + l.durationMin, 0) / sleep.length) : 0;
    const dietOnTrackPct = diet.length > 0
      ? Math.round((diet.filter(d => d.onTrack).length / diet.length) * 100) : null;

    return {
      days,
      firstWeight,
      lastWeight,
      weightDeltaKg,
      toGoalKg,
      waterDaysHit,
      stepDaysHit,
      sleepDaysLogged: sleep.length,
      sleepAvgMin,
      exerciseDays,
      exerciseTotalMin: exercise.reduce((s, l) => s + l.durationMin, 0),
      dietOnTrackPct,
      loggedAnyDays,
      consistencyPct: Math.round((loggedAnyDays / days) * 100),
      bestStreak,
    } satisfies HealthReport;
  }, [days]);
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
