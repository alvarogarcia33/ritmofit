import type { PersonalPlanArchive, Progress } from "./fit";
import { dayDate } from "./fit";
import {
  exerciseIdentity,
  readSetPerformance,
  setKeyExercise,
  type SetPerformance,
} from "@shared/set-performance";

export type PreviousExerciseMarks = {
  date: string;
  sets: Array<{ round: number; mark: SetPerformance }>;
};

function scheduledDate(startDate: string, dayKey: string): string | null {
  const match = /^w(\d{1,2})-d([1-7])$/.exec(dayKey);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  return dayDate(startDate, Number(match[1]), Number(match[2]));
}

/** Finds the latest *previous* day, including exercises moved between days
 * and completed sets kept in an archived personal-plan edition. */
export function previousExerciseMarks(
  exerciseId: string,
  selectedDayKey: string,
  selectedStartDate: string,
  progress: readonly Progress[],
  archives: readonly PersonalPlanArchive[]
): PreviousExerciseMarks | null {
  const targetId = exerciseIdentity(exerciseId);
  const currentDate = scheduledDate(selectedStartDate, selectedDayKey);
  if (!currentDate) return null;
  const candidates: PreviousExerciseMarks[] = [];
  const scan = (records: readonly Progress[], startDate: string) => {
    for (const record of records) {
      const date = scheduledDate(startDate, record.dayKey);
      if (!date || date >= currentDate) continue;
      const sets = readSetPerformance(record.setPerformance)
        .filter(mark => exerciseIdentity(setKeyExercise(mark.setKey)) === targetId)
        .map(mark => ({
          round: Number(mark.setKey.split(":").at(-1)),
          mark,
        }))
        .filter(mark => Number.isSafeInteger(mark.round) && mark.round > 0);
      if (sets.length) candidates.push({ date, sets });
    }
  };
  scan(progress, selectedStartDate);
  for (const version of archives) scan(version.progress, version.startDate);
  candidates.sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}
