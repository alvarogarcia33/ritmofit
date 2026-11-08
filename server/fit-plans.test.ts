import { describe, expect, it } from "vitest";
import { DEFAULT_PLANS } from "../shared/programs";
import {
  PlanValidationError,
  planStructureSignature,
  registerFitPlanRoutes,
  validatePlanProgressInput,
  validateTrainingPlan,
} from "./fit-plans";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function routeHarness() {
  const routes: Array<{ method: string; path: string; handler: Function }> = [];
  const router = {
    get(path: string, handler: Function) {
      routes.push({ method: "GET", path, handler });
      return this;
    },
    post(path: string, handler: Function) {
      routes.push({ method: "POST", path, handler });
      return this;
    },
    put(path: string, handler: Function) {
      routes.push({ method: "PUT", path, handler });
      return this;
    },
  };
  return { routes, router };
}

describe("Ritmo Fit multi-plan validation", () => {
  it("accepts both defaults without mutating shared catalog data", () => {
    const before = clone(DEFAULT_PLANS);
    const validated = DEFAULT_PLANS.map(validateTrainingPlan);

    expect(validated.map(plan => plan.id)).toEqual(["adelgazar", "tonificar"]);
    expect(validated[1].routine.first).toHaveLength(5);
    expect(
      validated[1].routine.first.reduce(
        (total, day) => total + day.exercises.length,
        0
      )
    ).toBe(28);
    expect(DEFAULT_PLANS).toEqual(before);
  });

  it("allows an incomplete draft but refuses to publish it", () => {
    const draft = clone(DEFAULT_PLANS[1]);
    draft.id = "plan-nuevo";
    draft.published = false;
    draft.coverImage = "";
    draft.routine = { first: [], second: [] };
    expect(validateTrainingPlan(draft).routine.first).toEqual([]);
    expect(() => validateTrainingPlan({ ...draft, published: true })).toThrow(
      PlanValidationError
    );
    draft.coverImage = "/plans/tonificar/day-1.webp";
    draft.routine = {
      first: [{ ...DEFAULT_PLANS[1].routine.first[0], exercises: [] }],
      second: [{ ...DEFAULT_PLANS[1].routine.first[0], exercises: [] }],
    };
    expect(validateTrainingPlan(draft).routine.first[0].exercises).toEqual([]);
    expect(() => validateTrainingPlan({ ...draft, published: true })).toThrow(
      "al menos un ejercicio"
    );
  });

  it("keeps structural signatures stable and rejects unsafe catalog input", () => {
    const original = validateTrainingPlan(DEFAULT_PLANS[1]);
    const metadataEdit = clone(original);
    metadataEdit.description = "Texto actualizado";
    metadataEdit.routine.first[0].exercises[0].tips = "Otra indicación";
    expect(planStructureSignature(metadataEdit)).toBe(
      planStructureSignature(original)
    );

    const xss = clone(original);
    xss.title = "<img src=x onerror=alert(1)>";
    expect(() => validateTrainingPlan(xss)).toThrow(PlanValidationError);

    const duplicate = clone(original);
    duplicate.routine.first[0].exercises[1].id =
      duplicate.routine.first[0].exercises[0].id;
    expect(() => validateTrainingPlan(duplicate)).toThrow("está repetido");

    const unsafeVideo = clone(original);
    unsafeVideo.routine.first[0].exercises[0].videoUrl =
      "https://evil.example/video";
    expect(() => validateTrainingPlan(unsafeVideo)).toThrow("YouTube o Vimeo");
  });

  it("uses shared required-set helpers and does not require cardio for straight plans", () => {
    const plan = validateTrainingPlan(DEFAULT_PLANS[1]);
    const required = validatePlanProgressInput(plan, 1, 1, "beginner", {
      completedSets: [
        ...Array.from({ length: 3 }, (_, round) =>
          plan.routine.first[0].exercises.flatMap(exercise =>
            Array.from(
              { length: exercise.sets ?? 3 },
              (_, set) => `${exercise.id}:${set + 1}`
            )
          )
        ).flat(),
      ],
      cardioDone: false,
      warmupDone: false,
    });
    expect(required.completed).toBe(true);
    expect(required.requiredSets).toHaveLength(18);

    expect(() =>
      validatePlanProgressInput(plan, 1, 1, "beginner", {
        completedSets: ["tone-d1-e1:4"],
        cardioDone: false,
        warmupDone: false,
      })
    ).toThrow("no corresponde");
  });
});

describe("Ritmo Fit multi-plan authorization", () => {
  it("rejects a normal user before touching admin storage routes", async () => {
    const { routes, router } = routeHarness();
    const failures: Array<{ status: number; message: string }> = [];
    registerFitPlanRoutes(router as never, {
      requireAuth: async () => ({
        user: { role: "user" } as never,
        tokenHash: "test",
      }),
      bodyOf: () => ({}),
      fail: (status, message) => {
        failures.push({ status, message });
        throw new Error(`${status}:${message}`);
      },
      toPublicFitUser: () => ({}) as never,
      toPublicProgress: () => ({}) as never,
      sanitizeProgress: () => ({
        completedSets: [],
        cardioDone: false,
        warmupDone: false,
        completedAt: null,
      }),
      hasPartialProgress: () => false,
    });

    const adminRoute = routes.find(
      route => route.method === "GET" && route.path === "/admin/plans"
    );
    expect(adminRoute).toBeDefined();
    const next = () => undefined;
    await adminRoute!.handler({} as never, {} as never, next);
    expect(failures).toEqual([
      { status: 403, message: "Se requiere rol de administrador" },
    ]);
  });
});
