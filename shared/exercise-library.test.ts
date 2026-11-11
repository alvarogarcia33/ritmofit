import { describe, expect, it } from "vitest";
import {
  buildPersonalPlan,
  EXERCISE_MUSCLE_GROUPS,
  PERSONAL_PLAN_ADMIN_FILTER_ID,
  PERSONAL_PLAN_COVER,
  PERSONAL_PLAN_ID_PREFIX,
  personalPlanAdminFilterOption,
  personalPlanDraftFromPlan,
  PersonalPlanInputError,
} from "./exercise-library";
import { DEFAULT_PLANS, requiredPlanSets, planTotalSessions } from "./programs";
import { validateTrainingPlan } from "../server/fit-plans";

const id = `${PERSONAL_PLAN_ID_PREFIX}12345678-1234-4234-8234-123456789abc`;

describe("Catálogo de grupos musculares y Plan Personal", () => {
  it("presenta grupos en español con ejercicios seleccionables", () => {
    expect(EXERCISE_MUSCLE_GROUPS.map(group => group.name)).toEqual([
      "Pecho",
      "Espalda",
      "Hombros",
      "Bíceps",
      "Tríceps",
      "Cuádriceps",
      "Femorales",
      "Glúteos",
      "Aductores",
      "Abductores",
      "Pantorrillas",
      "Abdomen y core",
    ]);
    expect(
      EXERCISE_MUSCLE_GROUPS.find(group => group.id === "pecho")?.exercises.map(
        item => item.name
      )
    ).toContain("Press inclinado con barra");
    expect(
      EXERCISE_MUSCLE_GROUPS.find(
        group => group.id === "espalda"
      )?.exercises.map(item => item.name)
    ).toContain("Remo con mancuerna");
  });

  it("amplía el catálogo de todos los grupos sin eliminar ejercicios previos", () => {
    const expectedCounts: Record<string, number> = {
      pecho: 8,
      espalda: 9,
      hombros: 6,
      biceps: 6,
      triceps: 6,
      cuadriceps: 7,
      femorales: 6,
      gluteos: 6,
      aductores: 3,
      abductores: 5,
      pantorrillas: 5,
      core: 7,
    };
    for (const group of EXERCISE_MUSCLE_GROUPS) {
      expect(group.exercises, group.name).toHaveLength(expectedCounts[group.id]);
      expect(group.exercises.every(item => item.muscleGroupId === group.id))
        .toBe(true);
    }

    const allExercises = EXERCISE_MUSCLE_GROUPS.flatMap(group => group.exercises);
    expect(allExercises).toHaveLength(74);
    expect(new Set(allExercises.map(item => item.id)).size).toBe(74);
    expect(
      EXERCISE_MUSCLE_GROUPS.find(group => group.id === "espalda")
        ?.exercises.map(item => item.name)
    ).toContain("Jalón en polea alta con agarre V");
    for (const addedId of [
      "press-pecho-maquina",
      "dominadas-asistidas",
      "remo-maquina-pecho-apoyado",
      "press-arnold",
      "curl-biceps-polea-baja",
      "press-banca-agarre-cerrado",
      "sentadilla-hack",
      "curl-femoral-pie",
      "pull-through-polea",
      "aduccion-polea-baja",
      "clamshell-banda",
      "pantorrillas-una-pierna",
      "plancha-lateral",
    ]) {
      expect(allExercises.some(item => item.id === addedId)).toBe(true);
    }
  });

  it("guarda y recupera los ejercicios nuevos sin alterar la dosis ni el historial del modelo", () => {
    const draft = {
      days: [
        {
          day: 1,
          exercises: [
            { exerciseId: "jalon-polea-agarre-v", sets: 4, target: 12 },
            { exerciseId: "dominadas-asistidas", sets: 3, target: 8 },
          ],
        },
        {
          day: 4,
          exercises: [
            { exerciseId: "plancha-lateral", sets: 3, target: 40 },
          ],
        },
      ],
    };
    const plan = buildPersonalPlan(id, draft);
    expect(validateTrainingPlan(plan)).toEqual(plan);
    expect(plan.routine.first[0].exercises.map(item => item.id)).toEqual([
      "pp-d1-jalon-polea-agarre-v",
      "pp-d1-dominadas-asistidas",
    ]);
    expect(plan.routine.first[0].exercises[0].sets).toBe(4);
    expect(plan.routine.first[0].exercises[0].reps).toBe("12 repeticiones");
    expect(plan.routine.first[1].exercises[0].seconds).toBe(40);
    expect(plan.routine.first[1].exercises[0].reps).toBe("40 segundos");
    expect(personalPlanDraftFromPlan(plan)).toEqual(draft);
  });

  it("arma cuatro semanas por usuario, acepta domingo y conserva series/repeticiones elegidas", () => {
    const plan = buildPersonalPlan(id, {
      title: "Otro título que no se acepta",
      ownerId: 999,
      days: [
        {
          day: 1,
          exercises: [
            { exerciseId: "press-plano-barra", sets: 4, target: 8 },
            { exerciseId: "plancha-frontal", sets: 3, target: 40 },
          ],
        },
        {
          day: 7,
          exercises: [{ exerciseId: "curl-martillo", sets: 2, target: 12 }],
        },
      ],
    });

    expect(plan.id).toBe(id);
    expect(plan.title).toBe("Plan Personal");
    expect(plan.coverImage).toBe(PERSONAL_PLAN_COVER);
    expect(plan.published).toBe(true);
    expect(plan.isPersonal).toBeUndefined();
    expect(validateTrainingPlan(plan)).toEqual(plan);
    expect(plan.mode).toBe("straight");
    expect(plan.routine.first.map(day => day.day)).toEqual([1, 7]);
    expect(plan.routine.second.map(day => day.day)).toEqual([1, 7]);
    expect(
      plan.routine.first[0].exercises.map(item => [
        item.sets,
        item.reps,
        item.seconds,
      ])
    ).toEqual([
      [4, "8 repeticiones", undefined],
      [3, "40 segundos", 40],
    ]);
    expect(plan.routine.first[1].label).toBe("Domingo");
    expect(
      plan.routine.first[0].exercises.every(
        item => !item.videoUrl && !item.thumbnail && !item.sourceImage
      )
    ).toBe(true);
    expect(personalPlanDraftFromPlan(plan)).toEqual({
      days: [
        {
          day: 1,
          exercises: [
            { exerciseId: "press-plano-barra", sets: 4, target: 8 },
            { exerciseId: "plancha-frontal", sets: 3, target: 40 },
          ],
        },
        {
          day: 7,
          exercises: [{ exerciseId: "curl-martillo", sets: 2, target: 12 }],
        },
      ],
    });
  });

  it("no permite títulos, IDs de ejercicio o propietarios impuestos por el cliente", () => {
    const plan = buildPersonalPlan(id, {
      id: "adelgazar",
      ownerId: 1,
      coverImage: "https://malicious.invalid/cover.jpg",
      days: [
        {
          day: 2,
          exercises: [{ exerciseId: "remo-mancuerna", sets: 3, target: 10 }],
        },
      ],
    });
    expect(plan.id).toBe(id);
    expect(plan.title).toBe("Plan Personal");
    expect(plan.coverImage).toBe(PERSONAL_PLAN_COVER);
    expect(plan.routine.first[0].exercises[0].name).toBe("Remo con mancuerna");
  });

  it("rechaza IDs ajenos al catálogo, repeticiones, series y días ambiguos", () => {
    const invalidPlans = [
      { days: [] },
      {
        days: [
          {
            day: 8,
            exercises: [{ exerciseId: "curl-barra", sets: 3, target: 10 }],
          },
        ],
      },
      {
        days: [
          {
            day: 1,
            exercises: [{ exerciseId: "otro-ejercicio", sets: 3, target: 10 }],
          },
        ],
      },
      {
        days: [
          {
            day: 1,
            exercises: [{ exerciseId: "curl-barra", sets: 11, target: 10 }],
          },
        ],
      },
      {
        days: [
          {
            day: 1,
            exercises: [{ exerciseId: "curl-barra", sets: 3, target: 101 }],
          },
        ],
      },
      {
        days: [
          {
            day: 1,
            exercises: [{ exerciseId: "curl-barra", sets: 3, target: 10 }],
          },
          {
            day: 1,
            exercises: [{ exerciseId: "curl-martillo", sets: 3, target: 10 }],
          },
        ],
      },
      {
        days: [
          {
            day: 1,
            exercises: [
              { exerciseId: "curl-barra", sets: 3, target: 10 },
              { exerciseId: "curl-barra", sets: 2, target: 8 },
            ],
          },
        ],
      },
    ];
    for (const value of invalidPlans)
      expect(() => buildPersonalPlan(id, value)).toThrow(
        PersonalPlanInputError
      );
  });

  it("acepta siete días y muchos grupos sin exceder límites, conservando planes originales", () => {
    const before = JSON.stringify(DEFAULT_PLANS);
    const exercises = EXERCISE_MUSCLE_GROUPS.map(group => ({
      exerciseId: group.exercises[0].id,
      sets: 10,
      target: 100,
    }));
    const plan = buildPersonalPlan(id, {
      days: Array.from({ length: 7 }, (_, index) => ({
        day: 7 - index,
        exercises,
      })),
    });
    expect(validateTrainingPlan(plan)).toEqual(plan);
    expect(plan.routine.first.map(day => day.day)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(planTotalSessions(plan)).toBe(28);
    expect(requiredPlanSets(plan, 4, 7, "beginner")).toHaveLength(
      exercises.length * 10
    );
    expect(JSON.stringify(DEFAULT_PLANS)).toBe(before);
    expect(
      new Set(
        EXERCISE_MUSCLE_GROUPS.flatMap(group =>
          group.exercises.map(item => item.id)
        )
      ).size
    ).toBe(EXERCISE_MUSCLE_GROUPS.flatMap(group => group.exercises).length);
  });

  it("valida límites de duración, fracciones, IDs privados y más de 20 ejercicios", () => {
    const selection = { exerciseId: "plancha-frontal", sets: 1, target: 3600 };
    expect(
      buildPersonalPlan(id, { days: [{ day: 7, exercises: [selection] }] })
        .routine.first[0].exercises[0].seconds
    ).toBe(3600);
    for (const bad of [
      { ...selection, target: 3601 },
      { ...selection, sets: 1.5 },
      { ...selection, sets: "3" },
      { ...selection, target: 0 },
    ])
      expect(() =>
        buildPersonalPlan(id, { days: [{ day: 1, exercises: [bad] }] })
      ).toThrow(PersonalPlanInputError);
    expect(() =>
      buildPersonalPlan("personal-42", {
        days: [{ day: 1, exercises: [selection] }],
      })
    ).toThrow(PersonalPlanInputError);
    const tooMany = EXERCISE_MUSCLE_GROUPS.flatMap(group => group.exercises)
      .slice(0, 21)
      .map(item => ({ exerciseId: item.id, sets: 3, target: 10 }));
    expect(() =>
      buildPersonalPlan(id, { days: [{ day: 1, exercises: tooMany }] })
    ).toThrow(PersonalPlanInputError);
  });

  it("ofrece al admin un filtro sintético sin convertirlo en un plan público vacío", () => {
    const option = personalPlanAdminFilterOption();
    expect(option.id).toBe(PERSONAL_PLAN_ADMIN_FILTER_ID);
    expect(option.isPersonal).toBe(true);
    expect(option.routine.first).toEqual([]);
    expect(option.routine.second).toEqual([]);
  });
});
