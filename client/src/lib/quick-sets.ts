import type { Exercise } from "@shared/routine";
import {
  validateSetPerformance,
  type SetPerformance,
} from "@shared/set-performance";

export type SetMarkDraft = {
  weightKg: string;
  reps: string;
};

/**
 * Commit all currently typed measurements for one exercise, without deleting
 * marks of other exercises. No network effects: the caller can send this and
 * the set check together in a single atomic progress request.
 */
export function mergeExerciseMarks(
  exercise: Pick<Exercise, "id" | "seconds" | "reps">,
  rounds: number,
  drafts: Readonly<Record<string, SetMarkDraft>>,
  existing: readonly SetPerformance[]
): SetPerformance[] {
  const keys = Array.from({ length: rounds }, (_, i) => `${exercise.id}:${i + 1}`);
  const timed = Boolean(exercise.seconds || /segundos/i.test(exercise.reps ?? ""));
  const submitted: SetPerformance[] = keys.flatMap(key => {
    const draft = drafts[key];
    const weightText = draft?.weightKg.trim() ?? "";
    const repText = timed ? "" : (draft?.reps.trim() ?? "");
    if (!weightText && !repText) return [];
    return [{
      setKey: key,
      weightKg: weightText ? Number(weightText) : null,
      reps: repText ? Number(repText) : null,
    }];
  });
  const checked = validateSetPerformance(
    submitted,
    keys,
    timed ? new Set([exercise.id]) : new Set()
  );
  return [
    ...existing.filter(mark => !keys.includes(mark.setKey)),
    ...checked,
  ];
}

/** Explicitly shows unsaved changes before navigating away from this day. */
export function hasUnsavedExerciseMarks(
  requiredKeys: readonly string[],
  drafts: Readonly<Record<string, SetMarkDraft>>,
  persisted: readonly SetPerformance[]
): boolean {
  const saved = new Map(persisted.map(mark => [mark.setKey, mark]));
  return requiredKeys.some(key => {
    const typed = drafts[key];
    const stored = saved.get(key);
    const weight = typed?.weightKg.trim() ?? "";
    const reps = typed?.reps.trim() ?? "";
    return (
      weight !== (stored?.weightKg == null ? "" : String(stored.weightKg)) ||
      reps !== (stored?.reps == null ? "" : String(stored.reps))
    );
  });
}
