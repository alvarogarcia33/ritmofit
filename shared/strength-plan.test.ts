import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANS,
  planConfig,
  planDay,
  planDays,
  planTotalSessions,
  requiredPlanSets,
} from "./programs";
import { STRENGTH_5D_PLAN } from "./strength-plan";
import { validateTrainingPlan } from "../server/fit-plans";

describe("Fuerza Integral 5D como tercer plan independiente", () => {
  const plan = STRENGTH_5D_PLAN;

  it("se registra como opción nueva sin sustituir Adelgazar ni Tonificar", () => {
    expect(DEFAULT_PLANS.map(p => p.id)).toEqual([
      "adelgazar", "tonificar", "fuerza-integral-5d-adaptacion", "fuerza-integral-5d",
    ]);
    expect(new Set(DEFAULT_PLANS.map(p => p.id)).size).toBe(4);
    expect(plan.title).toBe("Fuerza Integral 5D");
    expect(plan.published).toBe(true);
  });

  it("contiene cinco días por semana y 40 sesiones en ocho semanas", () => {
    expect(plan.weeks).toBe(8);
    expect(planDays(plan, 1).map(d => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(planDays(plan, 8).map(d => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(planDay(plan, 1, 6)).toBeUndefined();
    expect(planDay(plan, 8, 7)).toBeUndefined();
    expect(planTotalSessions(plan)).toBe(40);
  });

  it("reproduce las 88 series y objetivos de repeticiones del Excel", () => {
    expect(plan.routine.first.map(d =>
      d.exercises.reduce((total, exercise) => total + (exercise.sets ?? 0), 0)
    )).toEqual([17, 18, 17, 18, 18]);
    expect(plan.routine.first.flatMap(d => d.exercises)).toHaveLength(33);
    expect(plan.routine.first.flatMap(d => d.exercises)
      .reduce((total, exercise) => total + (exercise.sets ?? 0), 0)).toBe(88);
    expect(planDay(plan, 1, 1)?.exercises[0].name).toBe("Press de banca con barra");
    expect(planDay(plan, 1, 1)?.exercises[0].sets).toBe(4);
    expect(planDay(plan, 1, 1)?.exercises[0].reps).toBe("5 repeticiones");
    expect(planDay(plan, 1, 4)?.exercises[1].reps).toBe("8 repeticiones por lado");
    expect(requiredPlanSets(plan, 1, 1, "beginner")).toHaveLength(17);
    expect(requiredPlanSets(plan, 8, 5, "advanced")).toHaveLength(18);
  });

  it("no impone cargas, cardio ni niveles de series", () => {
    expect(plan.mode).toBe("straight");
    expect(planConfig(plan, "beginner").cardioMinutes).toBe(0);
    expect(planConfig(plan, "advanced").cardioMinutes).toBe(0);
    expect(plan.routine.first.flatMap(d => d.exercises).every(e => !("weightKg" in e))).toBe(true);
    expect(validateTrainingPlan(plan)).toEqual(plan);
  });

  it("no comparte IDs de series con los otros planes", () => {
    const previousIds = new Set(DEFAULT_PLANS.slice(0, 2)
      .flatMap(p => p.routine.first.flatMap(day => day.exercises.map(e => e.id))));
    const ids = plan.routine.first.flatMap(day => day.exercises.map(e => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => !previousIds.has(id))).toBe(true);
  });
});
