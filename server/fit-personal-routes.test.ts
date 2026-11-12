import { beforeEach, describe, expect, it, vi } from "vitest";
const store = vi.hoisted(() => ({
  listFitPlans: vi.fn(),
  findFitPlan: vi.fn(),
  findFitUserPlan: vi.fn(),
  findFitPersonalPlan: vi.fn(),
  hasFitPlanProgress: vi.fn(),
  currentFitPersonalPlanVersion: vi.fn(),
  listFitPersonalPlanVersions: vi.fn(),
  saveFitPersonalPlan: vi.fn(),
  updateFitPersonalPlan: vi.fn(),
  findFitPlanEnrollment: vi.fn(),
  listFitPlanProgress: vi.fn(),
  findFitPlanProgress: vi.fn(),
  saveFitPlanProgress: vi.fn(),
  saveFitPlanEnrollment: vi.fn(),
  findFitUserById: vi.fn(),
}));
vi.mock("./fit-plan-db", async importOriginal => ({
  ...(await importOriginal<object>()),
  ...store,
}));
vi.mock("./fit-db", async importOriginal => ({
  ...(await importOriginal<object>()),
  findFitUserById: store.findFitUserById,
}));
import { registerFitPlanRoutes } from "./fit-plans";
import {
  FitPersonalPlanExistsError,
  FitPersonalPlanLockedError,
  FitPersonalPlanConflictError,
} from "./fit-plan-db";
import {
  buildPersonalPlan,
  PERSONAL_PLAN_ADMIN_FILTER_ID,
} from "../shared/exercise-library";
import { DEFAULT_PLANS } from "../shared/programs";
const draft = {
  days: [
    { day: 7, exercises: [{ exerciseId: "curl-barra", sets: 3, target: 10 }] },
  ],
};
const plan = buildPersonalPlan(
  "personal-12345678-1234-4234-8234-123456789abc",
  draft
);
const owned = { id: plan.id, owner_user_id: 42, payload: plan };
const user = {
  id: 42,
  role: "user",
  level: "beginner",
  timezone: "America/Argentina/Buenos_Aires",
  start_date: "2026-11-16",
};
function harness(account: unknown = user) {
  const routes: Array<{ method: string; path: string; handler: Function }> = [];
  const router = Object.fromEntries(
    ["get", "post", "put"].map(method => [
      method,
      (path: string, handler: Function) =>
        routes.push({ method: method.toUpperCase(), path, handler }),
    ])
  );
  const fail = (status: number, message: string): never => {
    throw Object.assign(new Error(message), { status });
  };
  const auth = vi.fn(async () =>
    account
      ? { user: account, tokenHash: "mock" }
      : fail(401, "Debes iniciar sesión")
  );
  registerFitPlanRoutes(router as never, {
    requireAuth: auth as never,
    bodyOf: req => req.body,
    fail,
    toPublicFitUser: account => account as never,
    toPublicProgress: row => row as never,
    sanitizeProgress: () => ({
      completedSets: [],
      setPerformance: [],
      cardioDone: false,
      warmupDone: false,
      completedAt: null,
    }),
    hasPartialProgress: () => false,
  });
  const invoke = (
    method: string,
    path: string,
    body: unknown = {},
    params: object = {}
  ) =>
    new Promise<{ status: number; data?: any; error?: Error }>(resolve => {
      let status = 200;
      routes
        .find(route => route.method === method && route.path === path)!
        .handler(
          { body, params },
          {
            status(code: number) {
              status = code;
              return this;
            },
            json(data: any) {
              resolve({ status, data });
            },
          },
          (error: Error & { status: number }) =>
            resolve({ status: error.status ?? 500, error })
        );
    });
  return { invoke, auth };
}
beforeEach(() => {
  Object.values(store).forEach(mock => mock.mockReset());
  store.listFitPlans.mockResolvedValue(
    DEFAULT_PLANS.map(payload => ({
      id: payload.id,
      owner_user_id: null,
      payload,
    }))
  );
  store.findFitPlan.mockResolvedValue(null);
  store.findFitUserPlan.mockResolvedValue(null);
  store.findFitPersonalPlan.mockResolvedValue(null);
  store.hasFitPlanProgress.mockResolvedValue(false);
  store.currentFitPersonalPlanVersion.mockResolvedValue(1);
  store.listFitPersonalPlanVersions.mockResolvedValue([]);
  store.findFitUserById.mockResolvedValue(user);
  store.listFitPlanProgress.mockResolvedValue([]);
  store.findFitPlanProgress.mockResolvedValue(null);
});

describe("Rutas privadas de Plan Personal con almacenamiento mock", () => {
  it.each(["GET", "POST", "PUT"])(
    "exige sesión antes de %s /personal-plan",
    async method => {
      const { invoke } = harness(null);
      expect((await invoke(method, "/personal-plan", draft)).status).toBe(401);
      Object.values(store).forEach(mock => expect(mock).not.toHaveBeenCalled());
    }
  );
  it("devuelve únicamente globales publicados y plan del dueño, sin compartirlo en admin catálogo", async () => {
    store.findFitPersonalPlan.mockResolvedValue(owned);
    const result = await harness().invoke("GET", "/plans");
    expect(store.findFitPersonalPlan).toHaveBeenCalledWith(42);
    expect(result.data.plans.map((item: any) => item.id)).toEqual([
      "adelgazar",
      "tonificar",
      plan.id,
    ]);
    expect(result.data.plans.at(-1).isPersonal).toBe(true);
    const admin = await harness({ ...user, role: "admin" }).invoke(
      "GET",
      "/admin/plans"
    );
    expect(admin.data.plans.map((item: any) => item.id)).toEqual([
      "adelgazar",
      "tonificar",
    ]);
  });
  it("siempre permite editar y comunica progreso y edición vigente", async () => {
    expect((await harness().invoke("GET", "/personal-plan")).data).toEqual({
      plan: null,
      editable: true,
      hasProgress: false,
      version: 1,
    });
    store.findFitPersonalPlan.mockResolvedValue(owned);
    store.hasFitPlanProgress.mockResolvedValue(true);
    store.currentFitPersonalPlanVersion.mockResolvedValue(3);
    const result = await harness().invoke("GET", "/personal-plan");
    expect(result.data.editable).toBe(true);
    expect(result.data.hasProgress).toBe(true);
    expect(result.data.version).toBe(3);
    expect(store.hasFitPlanProgress).toHaveBeenCalledWith(42, plan.id);
  });

  it("crea UUID en servidor, ignora dueño/ID/medios y guarda matrícula para sesión real", async () => {
    const result = await harness().invoke("POST", "/personal-plan", {
      ...draft,
      id: "adelgazar",
      owner_user_id: 99,
      title: "Otro",
      role: "admin",
      coverImage: "evil",
    });
    expect(result.status).toBe(201);
    const saved = store.saveFitPersonalPlan.mock.calls[0][0];
    expect(saved.userId).toBe(42);
    expect(saved.plan.id).toMatch(/^personal-[a-f0-9-]{36}$/);
    expect(saved.plan.title).toBe("Plan Personal");
    expect(saved.plan).not.toHaveProperty("owner_user_id");
    expect(saved.plan.routine.first[0].exercises[0].videoUrl).toBe("");
    expect(result.data.activePlanId).toBe(saved.plan.id);
  });
  it("rechaza body inválido sin guardar y un segundo plan con 409", async () => {
    expect(
      (await harness().invoke("POST", "/personal-plan", { days: [] })).status
    ).toBe(400);
    expect(store.saveFitPersonalPlan).not.toHaveBeenCalled();
    store.saveFitPersonalPlan.mockRejectedValue(
      new FitPersonalPlanExistsError()
    );
    expect(
      (await harness().invoke("POST", "/personal-plan", draft)).status
    ).toBe(409);
  });
  it("edita el plan propio con historial y comprueba la versión esperada", async () => {
    store.findFitPersonalPlan.mockResolvedValue(owned);
    store.updateFitPersonalPlan.mockResolvedValue({
      archived: true, version: 2, restarted: true,
    });
    const result = await harness().invoke("PUT", "/personal-plan", {
      ...draft,
      id: "tonificar",
      owner_user_id: 99,
      expectedPlan: { ...plan, isPersonal: true },
    });
    expect(result.status).toBe(200);
    expect(store.updateFitPersonalPlan.mock.calls[0][0]).toBe(42);
    expect(store.updateFitPersonalPlan.mock.calls[0][1]).toEqual(plan);
    expect(store.updateFitPersonalPlan.mock.calls[0][2]).toEqual(plan);
    expect(store.updateFitPersonalPlan.mock.calls[0][3]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.data).toMatchObject({
      archived: true, version: 2, restarted: true,
    });

    expect(
      (await harness().invoke("PUT", "/personal-plan", draft)).status
    ).toBe(400);
    store.updateFitPersonalPlan.mockRejectedValue(
      new FitPersonalPlanConflictError()
    );
    expect(
      (await harness().invoke("PUT", "/personal-plan", {
        ...draft, expectedPlan: plan,
      })).status
    ).toBe(409);
    store.updateFitPersonalPlan.mockRejectedValue(
      new FitPersonalPlanLockedError()
    );
    expect(
      (await harness().invoke("PUT", "/personal-plan", {
        ...draft, expectedPlan: plan,
      })).status
    ).toBe(409);
  });

  it("permite consultar versiones privadas solo al dueño de la sesión", async () => {
    store.findFitPersonalPlan.mockResolvedValue(owned);
    store.listFitPersonalPlanVersions.mockResolvedValue([
      {
        user_id: 42, plan_id: plan.id, version: 1,
        plan_payload: plan, progress_snapshot: [{
          day_key: "w1-d7", session_level: "beginner",
          completed_sets: '["pp-d7-curl-barra:1"]',
          cardio_done: 0, warmup_done: 1,
          completed_at: "2026-11-22T14:00:00.000Z",
          updated_at: "2026-11-22T14:00:00.000Z",
        }],
        start_date: "2026-11-16",
        archived_at: "2026-11-23T13:00:00.000Z",
      },
    ]);
    const found = await harness().invoke("GET", "/personal-plan/versions");
    expect(found.status).toBe(200);
    expect(found.data.versions[0].progress[0].completedSets).toEqual([
      "pp-d7-curl-barra:1",
    ]);
    expect(found.data.versions[0].plan.id).toBe(plan.id);
    expect(store.listFitPersonalPlanVersions).toHaveBeenCalledWith(42, plan.id);
    const unauth = await harness(null).invoke("GET", "/personal-plan/versions");
    expect(unauth.status).toBe(401);
  });

  it("no edita un inexistente ni usa el ID suministrado como fallback", async () => {
    expect(
      (
        await harness().invoke("PUT", "/personal-plan", {
          ...draft,
          id: plan.id,
        })
      ).status
    ).toBe(404);
    expect(store.updateFitPersonalPlan).not.toHaveBeenCalled();
  });
  it.each([
    ["GET", "/plans/:id/progress"],
    ["PUT", "/plans/:id/progress/:dayKey"],
    ["PUT", "/plans/:id/enrollment"],
  ])(
    "%s %s rechaza IDs privados de otras cuentas antes de acceder a progreso",
    async (method, path) => {
      const result = await harness().invoke(
        method,
        path,
        {},
        { id: plan.id, dayKey: "w1-d7" }
      );
      expect(result.status).toBe(404);
      expect(store.findFitUserPlan).toHaveBeenCalledWith(42, plan.id);
      expect(store.listFitPlanProgress).not.toHaveBeenCalled();
      expect(store.saveFitPlanProgress).not.toHaveBeenCalled();
      expect(store.saveFitPlanEnrollment).not.toHaveBeenCalled();
    }
  );
  it("guarda una sesión del domingo y transmite versión esperada sin isPersonal", async () => {
    store.findFitUserPlan.mockResolvedValue(owned);
    store.findFitPlanEnrollment.mockResolvedValue({
      user_id: 42,
      plan_id: plan.id,
      start_date: "2026-11-16",
      level: "beginner",
      rest_seconds: 90,
    });
    store.saveFitPlanProgress.mockResolvedValue({
      user_id: 42,
      plan_id: plan.id,
      day_key: "w1-d7",
      session_level: "beginner",
      completed_sets: ["pp-d7-curl-barra:1"],
      cardio_done: false,
      warmup_done: true,
      completed_at: null,
      updated_at: new Date(),
    });
    const result = await harness().invoke(
      "PUT",
      "/plans/:id/progress/:dayKey",
      {
        completedSets: ["pp-d7-curl-barra:1"],
        cardioDone: false,
        warmupDone: true,
      },
      { id: plan.id, dayKey: "w1-d7" }
    );
    expect(result.status).toBe(200);
    expect(
      store.saveFitPlanProgress.mock.calls[0][0].expectedPersonalPlan
    ).toEqual(plan);
    expect(result.data.progress.dayKey).toBe("w1-d7");
    store.saveFitPlanProgress.mockRejectedValue(
      new FitPersonalPlanLockedError()
    );
    expect(
      (
        await harness().invoke(
          "PUT",
          "/plans/:id/progress/:dayKey",
          { completedSets: [], cardioDone: false, warmupDone: true },
          { id: plan.id, dayKey: "w1-d7" }
        )
      ).status
    ).toBe(409);
  });
  it("filtro admin resuelve solo la rutina del usuario seleccionado y admite null", async () => {
    const { invoke } = harness({ ...user, id: 1, role: "admin" });
    const empty = await invoke(
      "GET",
      "/admin/users/:id/plan/:planId",
      {},
      { id: "42", planId: PERSONAL_PLAN_ADMIN_FILTER_ID }
    );
    expect(empty.data.plan).toBeNull();
    expect(empty.data.progress).toEqual([]);
    store.findFitPersonalPlan.mockResolvedValue(owned);
    store.findFitUserPlan.mockResolvedValue(owned);
    const result = await invoke(
      "GET",
      "/admin/users/:id/plan/:planId",
      {},
      { id: "42", planId: PERSONAL_PLAN_ADMIN_FILTER_ID }
    );
    expect(store.findFitPersonalPlan).toHaveBeenCalledWith(42);
    expect(store.findFitUserPlan).toHaveBeenCalledWith(42, plan.id);
    expect(store.listFitPlanProgress).toHaveBeenCalledWith(42, plan.id);
    expect(result.data.plan.id).toBe(plan.id);
  });
  it("filtro de admin nunca otorga privilegios a cuenta normal", async () => {
    expect(
      (
        await harness().invoke(
          "GET",
          "/admin/users/:id/plan/:planId",
          {},
          { id: "42", planId: PERSONAL_PLAN_ADMIN_FILTER_ID }
        )
      ).status
    ).toBe(403);
    expect(store.findFitPersonalPlan).not.toHaveBeenCalled();
    expect(store.findFitUserById).not.toHaveBeenCalled();
  });
});
