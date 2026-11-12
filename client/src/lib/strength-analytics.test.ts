import { describe, expect, it } from "vitest";
import { buildPersonalPlan } from "@shared/exercise-library";
import type { Progress, PersonalPlanArchive } from "./fit";
import { buildStrengthAnalytics } from "./strength-analytics";
import type { SetPerformance } from "@shared/set-performance";

const planId = "personal-12345678-1234-4234-8234-123456789abc";
const chest = "press-plano-barra";
const back = "jalon-polea-agarre-v";

function planFor(day: number, exerciseId: string) {
  return buildPersonalPlan(planId, {
    days: [{
      day,
      exercises: [{ exerciseId, sets: 3, target: 10 }],
    }],
  });
}

function session(
  dayKey: string,
  completedSets: string[],
  setPerformance?: SetPerformance[]
): Progress {
  return {
    dayKey,
    completedSets,
    setPerformance,
    cardioDone: false,
    warmupDone: false,
    completedAt: null,
    updatedAt: "2026-11-11T12:00:00Z",
  };
}

describe("Estadísticas de fuerza basadas en registros reales", () => {
  it("calcula el volumen con peso por repeticiones en series marcadas, no con objetivos", () => {
    const plan = planFor(1, chest);
    const first = "pp-d1-press-plano-barra:1";
    const second = "pp-d1-press-plano-barra:2";
    const third = "pp-d1-press-plano-barra:3";
    const result = buildStrengthAnalytics(plan, "2026-11-02", [
      session("w1-d1", [first, second], [
        { setKey: first, weightKg: 40, reps: 12 },
        { setKey: second, weightKg: 45, reps: 10 },
        { setKey: third, weightKg: 80, reps: 8 },
      ]),
    ]);
    expect(result.measuredSets).toBe(2);
    expect(result.volumeSets).toBe(2);
    expect(result.totalVolumeKg).toBe(930);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].maxWeightKg).toBe(45);
    expect(result.exercises[0].sessionsWithMarks).toBe(1);
    expect(result.weeklyVolume).toEqual([{
      monday: "2026-11-02",
      label: "Desde 02/11",
      volumeKg: 930,
      measuredSets: 2,
    }]);
  });

  it("no inventa volumen si falta peso o repeticiones y cuenta las mediciones incompletas", () => {
    const plan = planFor(1, chest);
    const ids = Array.from({ length: 3 }, (_, i) => `pp-d1-press-plano-barra:${i + 1}`);
    const result = buildStrengthAnalytics(plan, "2026-11-02", [
      session("w1-d1", ids, [
        { setKey: ids[0], weightKg: null, reps: 12 },
        { setKey: ids[1], weightKg: 50, reps: null },
      ]),
    ]);
    expect(result.measuredSets).toBe(2);
    expect(result.missingMeasurements).toBe(1);
    expect(result.volumeSets).toBe(0);
    expect(result.weeklyVolume).toEqual([]);
    expect(result.exercises[0].totalVolumeKg).toBe(0);
    expect(result.exercises[0].maxWeightKg).toBe(50);
    expect(result.exercises[0].timeline[0].volumeKg).toBeNull();
  });

  it("combina versiones del mismo ejercicio aunque cambie de día sin aplicar el plan nuevo al histórico", () => {
    const archivedPlan = planFor(1, back);
    const activePlan = planFor(5, back);
    const archive: PersonalPlanArchive = {
      version: 1,
      plan: archivedPlan,
      startDate: "2026-10-19",
      archivedAt: "2026-11-01T08:00:00Z",
      progress: [
        session("w1-d1", ["pp-d1-jalon-polea-agarre-v:1"], [
          { setKey: "pp-d1-jalon-polea-agarre-v:1", weightKg: 35, reps: 12 },
        ]),
      ],
    };
    const result = buildStrengthAnalytics(activePlan, "2026-11-02", [
      session("w1-d5", ["pp-d5-jalon-polea-agarre-v:1"], [
        { setKey: "pp-d5-jalon-polea-agarre-v:1", weightKg: 45, reps: 8 },
      ]),
    ], [archive]);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].maxWeightKg).toBe(45);
    expect(result.exercises[0].bestLoadDate).toBe("2026-11-06");
    expect(result.exercises[0].timeline).toEqual([
      { date: "2026-10-19", weightKg: 35, volumeKg: 420, completedMeasuredSets: 1 },
      { date: "2026-11-06", weightKg: 45, volumeKg: 360, completedMeasuredSets: 1 },
    ]);
    expect(result.totalVolumeKg).toBe(780);
    expect(result.exercises[0].sessionsWithMarks).toBe(2);
    expect(result.weeklyVolume.map(w => w.monday)).toEqual([
      "2026-10-19", "2026-11-02",
    ]);
  });

  it("no cuenta registros antiguos, marcas sin completar, ejercicios eliminados o días inválidos", () => {
    const plan = planFor(1, chest);
    const good = "pp-d1-press-plano-barra:1";
    const result = buildStrengthAnalytics(plan, "2026-11-02", [
      session("w1-d1", [good]),
      session("w2-d1", [], [{ setKey: good, weightKg: 90, reps: 5 }]),
      session("w3-d1", ["pp-d1-jalon-polea-agarre-v:1"], [
        { setKey: "pp-d1-jalon-polea-agarre-v:1", weightKg: 80, reps: 8 },
      ]),
      session("w9999-d1", [good], [{ setKey: good, weightKg: 80, reps: 10 }]),
      session("not-a-day", [good], [{ setKey: good, weightKg: 60, reps: 10 }]),
    ]);
    expect(result.measuredSets).toBe(0);
    expect(result.totalVolumeKg).toBe(0);
    expect(result.missingMeasurements).toBe(1);
    expect(result.exercises).toEqual([]);
  });

  it("agrupa correctamente por semana calendario y no compara en bloque semanas de versiones diferentes", () => {
    const plan = planFor(1, chest);
    const key = "pp-d1-press-plano-barra:1";
    const result = buildStrengthAnalytics(plan, "2026-11-02", [
      session("w1-d1", [key], [{ setKey: key, weightKg: 40, reps: 10 }]),
      session("w2-d1", [key], [{ setKey: key, weightKg: 42.5, reps: 10 }]),
      session("w3-d1", [key], [{ setKey: key, weightKg: 45, reps: 10 }]),
    ]);
    expect(result.weeklyVolume.map(w => w.volumeKg)).toEqual([400, 425, 450]);
    expect(result.weeklyVolume.map(w => w.monday)).toEqual([
      "2026-11-02", "2026-11-09", "2026-11-16",
    ]);
    expect(result.exercises[0].timeline).toHaveLength(3);
    expect(result.exercises[0].bestLoadDate).toBe("2026-11-16");
  });

  it("acepta cero kg medidos sin convertirlo en peso corporal", () => {
    const plan = planFor(1, chest);
    const key = "pp-d1-press-plano-barra:1";
    const result = buildStrengthAnalytics(plan, "2026-11-02", [
      session("w1-d1", [key], [{ setKey: key, weightKg: 0, reps: 15 }]),
    ]);
    expect(result.totalVolumeKg).toBe(0);
    expect(result.volumeSets).toBe(1);
    expect(result.exercises[0].maxWeightKg).toBe(0);
  });
});
