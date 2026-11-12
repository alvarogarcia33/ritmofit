import { describe, expect, it } from "vitest";
import { previousExerciseMarks } from "./strength";
import type { Progress, PersonalPlanArchive } from "./fit";
import { DEFAULT_PLANS } from "@shared/programs";

const mark = (dayKey: string, setKey: string, weightKg: number, reps: number): Progress => ({
  dayKey,
  completedSets: [setKey],
  setPerformance: [{ setKey, weightKg, reps }],
  cardioDone: false,
  warmupDone: false,
  completedAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
});

describe("Última carga registrada por ejercicio", () => {
  it("encuentra la sesión anterior del mismo ejercicio entre semanas", () => {
    const previous = previousExerciseMarks(
      "pp-d1-jalon-polea-agarre-v",
      "w2-d1",
      "2026-11-02",
      [mark("w1-d1", "pp-d1-jalon-polea-agarre-v:1", 45, 10)],
      []
    );
    expect(previous?.date).toBe("2026-11-02");
    expect(previous?.sets[0].mark.weightKg).toBe(45);
  });

  it("reconoce el mismo ejercicio aunque cambie de día entre versiones", () => {
    const archive: PersonalPlanArchive = {
      version: 1,
      plan: DEFAULT_PLANS[0],
      startDate: "2026-10-19",
      archivedAt: "2026-11-02T10:00:00.000Z",
      progress: [mark("w1-d1", "pp-d1-jalon-polea-agarre-v:1", 40, 12)],
    };
    const last = previousExerciseMarks(
      "pp-d5-jalon-polea-agarre-v",
      "w1-d5",
      "2026-11-02",
      [],
      [archive]
    );
    expect(last?.sets[0].mark.reps).toBe(12);
  });

  it("no muestra la serie del día actual ni una sesión futura", () => {
    expect(previousExerciseMarks(
      "pp-d1-jalon-polea-agarre-v",
      "w1-d1",
      "2026-11-09",
      [mark("w1-d1", "pp-d1-jalon-polea-agarre-v:1", 50, 8)],
      []
    )).toBeNull();
  });

  it("conserva la referencia más reciente al combinar activo y archivo", () => {
    const archive: PersonalPlanArchive = {
      version: 1,
      plan: DEFAULT_PLANS[0],
      startDate: "2026-10-19",
      archivedAt: "2026-11-02T10:00:00.000Z",
      progress: [mark("w1-d1", "pp-d1-jalon-polea-agarre-v:1", 35, 15)],
    };
    const current = mark("w1-d1", "pp-d1-jalon-polea-agarre-v:1", 50, 8);
    const last = previousExerciseMarks(
      "pp-d1-jalon-polea-agarre-v", "w2-d1", "2026-11-02", [current], [archive]
    );
    expect(last?.sets[0].mark.weightKg).toBe(50);
  });
});
