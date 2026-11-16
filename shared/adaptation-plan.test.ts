import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLANS,
  planConfig,
  planDay,
  planDays,
  planTotalSessions,
  requiredPlanSets,
} from "./programs";
import { ADAPTATION_5D_PLAN } from "./adaptation-plan";
import { validateTrainingPlan } from "../server/fit-plans";

describe("Fase inicial de Fuerza Integral 5D", () => {
  const plan = ADAPTATION_5D_PLAN;

  it("se ofrece antes de Fuerza Integral 5D sin sustituir otros planes", () => {
    expect(DEFAULT_PLANS.map(p => p.id)).toEqual([
      "adelgazar", "tonificar",
      "fuerza-integral-5d-adaptacion",
      "fuerza-integral-5d",
    ]);
    expect(new Set(DEFAULT_PLANS.map(p => p.id)).size).toBe(4);
    expect(plan.published).toBe(true);
    expect(plan.title).toContain("Fuerza Integral 5D");
    expect(validateTrainingPlan(plan)).toEqual(plan);
  });

  it("incluye cinco días por semana y seis semanas sin cardio obligatorio", () => {
    expect(plan.weeks).toBe(6);
    expect(planDays(plan, 1).map(day => day.day)).toEqual([1, 2, 3, 4, 5]);
    expect(planDays(plan, 6).map(day => day.day)).toEqual([1, 2, 3, 4, 5]);
    expect(planDay(plan, 6, 6)).toBeUndefined();
    expect(planTotalSessions(plan)).toBe(30);
    expect(planConfig(plan, "beginner").cardioMinutes).toBe(0);
  });

  it("empieza con 50 series semanales en semanas 1–2 y pasa a 60 en semanas 3–6", () => {
    expect(planDays(plan, 1).map(day => requiredPlanSets(plan, 1, day.day, "beginner").length))
      .toEqual([10, 10, 10, 10, 10]);
    expect(planDays(plan, 2).map(day => requiredPlanSets(plan, 2, day.day, "advanced").length))
      .toEqual([10, 10, 10, 10, 10]);
    expect(planDays(plan, 3).map(day => requiredPlanSets(plan, 3, day.day, "beginner").length))
      .toEqual([12, 12, 12, 12, 12]);
    expect(planDays(plan, 6).map(day => requiredPlanSets(plan, 6, day.day, "advanced").length))
      .toEqual([12, 12, 12, 12, 12]);
  });

  it("usa 12 repeticiones al inicio y 10 en compuestos después, sin trabajo al fallo", () => {
    expect(planDay(plan, 1, 1)?.exercises[0]).toMatchObject({
      name: "Press de pecho en máquina", sets: 2, reps: "12 repeticiones",
    });
    expect(planDay(plan, 3, 1)?.exercises[0]).toMatchObject({
      name: "Press de pecho en máquina", sets: 3, reps: "10 repeticiones",
    });
    expect(planDay(plan, 1, 4)?.exercises[2].reps).toBe("10 repeticiones por pierna");
    expect(planDay(plan, 3, 2)?.exercises[4].reps).toBe("10 repeticiones por lado");
    expect(plan.notes.join(" ")).toContain("reserva");
    expect(plan.notes.join(" ")).toContain("No se prescriben kilos");
    expect(plan.routine.first.flatMap(day => day.exercises).every(exercise => !("weightKg" in exercise))).toBe(true);
  });

  it("preserva los IDs de ejercicio entre fases y los separa de los otros planes", () => {
    const initial = plan.routine.first.flatMap(day => day.exercises.map(exercise => exercise.id));
    const later = plan.routine.second.flatMap(day => day.exercises.map(exercise => exercise.id));
    expect(initial).toEqual(later);
    expect(new Set(initial).size).toBe(initial.length);
    const otherIds = new Set(DEFAULT_PLANS.filter(p => p.id !== plan.id)
      .flatMap(p => p.routine.first.flatMap(day => day.exercises.map(e => e.id))));
    expect(initial.every(id => !otherIds.has(id))).toBe(true);
  });
});
