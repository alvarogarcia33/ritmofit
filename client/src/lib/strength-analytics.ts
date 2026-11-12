import type { Progress, PersonalPlanArchive } from "./fit";
import { dayDate } from "./fit";
import { planDays, type TrainingPlan } from "@shared/programs";
import {
  exerciseIdentity,
  readSetPerformance,
  setKeyExercise,
} from "@shared/set-performance";

/**
 * Every observation is an actually checked set with at least one measured value.
 * Planned target repetitions, unmarked sets and weight estimates are excluded.
 */
export type MeasuredStrengthSet = {
  exerciseId: string;
  name: string;
  date: string;
  setKey: string;
  weightKg: number | null;
  reps: number | null;
  /** External load multiplied by actual repetitions, not bodyweight or energy. */
  volumeKg: number | null;
};

export type StrengthExerciseSummary = {
  id: string;
  name: string;
  completedMeasuredSets: number;
  volumeSets: number;
  totalVolumeKg: number;
  maxWeightKg: number | null;
  bestLoadDate: string | null;
  sessionsWithMarks: number;
  timeline: Array<{
    date: string;
    weightKg: number | null;
    volumeKg: number | null;
    completedMeasuredSets: number;
  }>;
};

export type WeeklyVolume = {
  monday: string;
  label: string;
  volumeKg: number;
  measuredSets: number;
};

export type StrengthAnalytics = {
  exercises: StrengthExerciseSummary[];
  measuredSets: number;
  volumeSets: number;
  totalVolumeKg: number;
  /** Only calendar weeks containing a completed weight+repetitions set. */
  weeklyVolume: WeeklyVolume[];
  missingMeasurements: number;
};

function isValidDayKey(value: string): RegExpExecArray | null {
  return /^w([1-9]\d{0,3})-d([1-7])$/.exec(value);
}

function isValidMark(weightKg: number | null, reps: number | null): boolean {
  return (
    (weightKg === null ||
      (Number.isFinite(weightKg) && weightKg >= 0 && weightKg <= 1000)) &&
    (reps === null ||
      (Number.isSafeInteger(reps) && reps >= 1 && reps <= 200))
  );
}

function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function collectFromPlan(
  plan: TrainingPlan,
  startDate: string,
  records: readonly Progress[]
): { marks: MeasuredStrengthSet[]; missing: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return { marks: [], missing: 0 };

  const marks: MeasuredStrengthSet[] = [];
  let missing = 0;
  for (const record of records) {
    const match = isValidDayKey(record.dayKey);
    if (!match) continue;
    const week = Number(match[1]);
    const day = Number(match[2]);
    if (!plan.continuous && week > plan.weeks) continue;

    const routine = planDays(plan, week).find(item => item.day === day);
    if (!routine) continue;
    const exercisesById = new Map(routine.exercises.map(e => [e.id, e]));
    const done = new Set(record.completedSets);
    const measured = new Map(
      readSetPerformance(record.setPerformance).map(mark => [mark.setKey, mark])
    );
    const date = dayDate(startDate, week, day);
    for (const setKey of done) {
      const exercise = exercisesById.get(setKeyExercise(setKey));
      if (!exercise || !/^.+:[1-9]\d*$/.test(setKey)) continue;
      const mark = measured.get(setKey);
      if (!mark || !isValidMark(mark.weightKg, mark.reps) ||
          (mark.weightKg === null && mark.reps === null)) {
        missing++;
        continue;
      }
      const volumeKg =
        mark.weightKg !== null && mark.reps !== null
          ? mark.weightKg * mark.reps
          : null;
      marks.push({
        exerciseId: exerciseIdentity(exercise.id),
        name: exercise.name,
        date,
        setKey,
        weightKg: mark.weightKg,
        reps: mark.reps,
        volumeKg,
      });
    }
  }
  return { marks, missing };
}

export function buildStrengthAnalytics(
  activePlan: TrainingPlan,
  activeStartDate: string,
  activeProgress: readonly Progress[],
  versions: readonly PersonalPlanArchive[] = []
): StrengthAnalytics {
  const active = collectFromPlan(activePlan, activeStartDate, activeProgress);
  const observations = [...active.marks];
  let missingMeasurements = active.missing;
  // Each archived edition carries its own original plan and enrollment date.
  // Do not use today's plan structure for historical exercises.
  for (const version of versions) {
    const archived = collectFromPlan(
      version.plan,
      version.startDate,
      version.progress
    );
    observations.push(...archived.marks);
    missingMeasurements += archived.missing;
  }

  const summaryByExercise = new Map<string, StrengthExerciseSummary>();
  const byDay = new Map<string, {
    date: string;
    weightKg: number | null;
    volumeKg: number | null;
    completedMeasuredSets: number;
  }>();
  const sessions = new Map<string, Set<string>>();
  const weeks = new Map<string, WeeklyVolume>();
  let volumeSets = 0;
  let totalVolumeKg = 0;

  for (const mark of observations) {
    let summary = summaryByExercise.get(mark.exerciseId);
    if (!summary) {
      summary = {
        id: mark.exerciseId,
        name: mark.name,
        completedMeasuredSets: 0,
        volumeSets: 0,
        totalVolumeKg: 0,
        maxWeightKg: null,
        bestLoadDate: null,
        sessionsWithMarks: 0,
        timeline: [],
      };
      summaryByExercise.set(mark.exerciseId, summary);
    }
    summary.completedMeasuredSets++;
    if (mark.weightKg !== null &&
        (summary.maxWeightKg === null || mark.weightKg > summary.maxWeightKg ||
          (mark.weightKg === summary.maxWeightKg &&
            mark.date > (summary.bestLoadDate ?? "")))) {
      summary.maxWeightKg = mark.weightKg;
      summary.bestLoadDate = mark.date;
    }
    const dayKey = `${mark.exerciseId}|${mark.date}`;
    let day = byDay.get(dayKey);
    if (!day) {
      day = {
        date: mark.date,
        weightKg: null,
        volumeKg: null,
        completedMeasuredSets: 0,
      };
      byDay.set(dayKey, day);
    }
    day.completedMeasuredSets++;
    if (mark.weightKg !== null) {
      day.weightKg = Math.max(day.weightKg ?? mark.weightKg, mark.weightKg);
    }
    if (mark.volumeKg !== null) {
      day.volumeKg = (day.volumeKg ?? 0) + mark.volumeKg;
      summary.volumeSets++;
      summary.totalVolumeKg += mark.volumeKg;
      volumeSets++;
      totalVolumeKg += mark.volumeKg;
      const monday = mondayOf(mark.date);
      let week = weeks.get(monday);
      if (!week) {
        week = {
          monday,
          label: `Desde ${monday.slice(8, 10)}/${monday.slice(5, 7)}`,
          volumeKg: 0,
          measuredSets: 0,
        };
        weeks.set(monday, week);
      }
      week.volumeKg += mark.volumeKg;
      week.measuredSets++;
    }
    const sessionDates = sessions.get(mark.exerciseId) ?? new Set<string>();
    sessionDates.add(mark.date);
    sessions.set(mark.exerciseId, sessionDates);
  }

  for (const [id, summary] of summaryByExercise) {
    summary.sessionsWithMarks = sessions.get(id)?.size ?? 0;
    summary.timeline = [...byDay.entries()]
      .filter(([key]) => key.startsWith(`${id}|`))
      .map(([, day]) => day)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    exercises: [...summaryByExercise.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
    measuredSets: observations.length,
    volumeSets,
    totalVolumeKg,
    weeklyVolume: [...weeks.values()]
      .sort((a, b) => a.monday.localeCompare(b.monday)),
    missingMeasurements,
  };
}

export function formatStrengthNumber(value: number): string {
  return new Intl.NumberFormat("es-UY", {
    maximumFractionDigits: 2,
  }).format(value);
}
