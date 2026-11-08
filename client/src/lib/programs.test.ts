import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLANS,
  exerciseSets,
  planConfig,
  planDay,
  planDays,
  planTotalSessions,
  requiredPlanSets,
} from "../../../shared/programs";
import { ROUTINE } from "../../../shared/routine";
import { currentProgramDay, overdueDays, type FitUser } from "./fit";

const legacy = DEFAULT_PLANS.find(p => p.id === "adelgazar")!;
const tone = DEFAULT_PLANS.find(p => p.id === "tonificar")!;
const user: FitUser = {
  id: 1,
  username: "persona",
  fullName: "Persona",
  email: "persona@example.com",
  role: "user",
  level: "beginner",
  startDate: "2026-11-02",
  reminderTime: "09:00",
  remindersEnabled: true,
  timezone: "America/Santiago",
  createdAt: "2026-11-01T00:00:00Z",
  lastLogin: null,
};
afterEach(() => vi.useRealTimers());
describe("Biblioteca de planes y dosificación de las fuentes", () => {
  it("envuelve Adelgazar sin modificar su catálogo, sus días o sus 24 sesiones", () => {
    expect(legacy.routine).toBe(ROUTINE);
    expect(planTotalSessions(legacy)).toBe(24);
    expect(requiredPlanSets(legacy, 1, 1, "beginner")).toHaveLength(20);
    expect(requiredPlanSets(legacy, 1, 1, "intermediate")).toHaveLength(28);
    expect(requiredPlanSets(legacy, 1, 1, "advanced")).toHaveLength(27);
  });
  it("organiza Tonificar con las 28 fichas de lunes a viernes y deja el fin de semana sin sesión", () => {
    expect(tone.routine.first.map(d => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(tone.routine.first.map(d => d.exercises.length)).toEqual([
      6, 5, 6, 5, 6,
    ]);
    expect(tone.routine.first.flatMap(d => d.exercises)).toHaveLength(28);
    expect(planTotalSessions(tone)).toBe(20);
    expect(planDay(tone, 1, 6)).toBeUndefined();
    expect(planDay(tone, 1, 7)).toBeUndefined();
    expect(planDays(tone, 4).map(d => d.focus)).toEqual(
      planDays(tone, 1).map(d => d.focus)
    );
  });
  it("mantiene tres series y las cantidades específicas, sin niveles ni cardio ficticio", () => {
    const all = tone.routine.first.flatMap(d => d.exercises);
    expect(all.every(e => exerciseSets(tone, e, "advanced") === 3)).toBe(true);
    expect(planConfig(tone, "beginner").cardioMinutes).toBe(0);
    expect(planConfig(tone, "advanced").cardioMinutes).toBe(0);
    expect(
      planDay(tone, 1, 1)?.exercises.find(e => e.name === "Hip thrust")?.reps
    ).toBe("10 repeticiones");
    expect(
      planDay(tone, 1, 5)?.exercises.find(e => e.name === "Hip thrust")?.reps
    ).toBe("15 repeticiones");
    expect(
      all.filter(e => e.name === "Plancha frontal").map(e => e.seconds)
    ).toEqual([45, 45]);
    expect(all.find(e => e.name === "Femorales")?.reps).toContain(
      "10 bajando el peso a la mitad"
    );
    expect(all.find(e => e.name === "Sillón de cuádriceps")?.reps).toContain(
      "1 repetición al fallo"
    );
    expect(requiredPlanSets(tone, 1, 1, "beginner")).toHaveLength(18);
  });
  it("utiliza IDs nuevos y referencias originales, sin colisiones con el historial del PDF", () => {
    const old = new Set(
      Object.values(ROUTINE).flatMap(days =>
        days.flatMap(d => d.exercises.map(e => e.id))
      )
    );
    const all = tone.routine.first.flatMap(d => d.exercises);
    expect(new Set(all.map(e => e.id)).size).toBe(28);
    expect(
      all.every(
        e =>
          !old.has(e.id) &&
          e.sourceImage?.startsWith("/plans/tonificar/") &&
          e.thumbnail.startsWith("/plans/tonificar/")
      )
    ).toBe(true);
    expect(
      requiredPlanSets(legacy, 1, 1, "beginner").some(s =>
        requiredPlanSets(tone, 1, 1, "beginner").includes(s)
      )
    ).toBe(false);
  });
  it("calcula atrasos solo de los días propios del plan y respeta su fecha de inscripción", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T16:00:00Z"));
    expect(overdueDays(user, [], tone).map(x => x.key)).toEqual([
      "w1-d1",
      "w1-d2",
      "w1-d3",
      "w1-d4",
      "w1-d5",
    ]);
    expect(overdueDays(user, [], legacy)).toHaveLength(6);
    expect(overdueDays({ ...user, startDate: "2026-11-09" }, [], tone)).toEqual(
      []
    );
    expect(
      currentProgramDay({ ...user, startDate: "2026-10-05" }, tone)
    ).toEqual({ week: 4, day: 5 });
  });
  it("describe como opciones de la app el ciclo y descanso que las láminas no prescriben", () => {
    expect(tone.notes.join(" ")).toContain("no prescribe la duración");
    expect(tone.notes.join(" ")).toContain("90 segundos");
    expect(legacy.color).not.toBe(tone.color);
  });
});
