import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  execute: vi.fn(),
  getConnection: vi.fn(),
  connection: {
    beginTransaction: vi.fn(),
    execute: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  },
}));
vi.mock("./fit-db", () => ({
  getFitPool: () => ({
    execute: mock.execute,
    getConnection: mock.getConnection,
  }),
}));
import {
  initializeFitPlanDatabase,
  listFitPlans,
  findFitPlan,
  findFitUserPlan,
  findFitPersonalPlan,
  saveFitPersonalPlan,
  updateFitPersonalPlan,
  saveFitPlanProgress,
  FitPersonalPlanExistsError,
  FitPersonalPlanLockedError,
} from "./fit-plan-db";
import { buildPersonalPlan } from "../shared/exercise-library";
const plan = buildPersonalPlan(
  "personal-12345678-1234-4234-8234-123456789abc",
  {
    days: [
      {
        day: 7,
        exercises: [{ exerciseId: "curl-barra", sets: 3, target: 10 }],
      },
    ],
  }
);
const input = {
  userId: 42,
  plan,
  startDate: "2026-11-16",
  level: "beginner" as const,
  restSeconds: 90,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "mysql://mock-only-not-used");
  mock.execute.mockReset();
  mock.connection.execute.mockReset();
  mock.getConnection.mockResolvedValue(mock.connection);
});
afterEach(() => vi.unstubAllEnvs());

describe("Persistencia privada de Plan Personal con DB simulada", () => {
  it("añade columna nullable antes del índice único y no modifica progreso ni payloads", async () => {
    mock.execute.mockImplementation(async (sql: string, params?: string[]) => {
      if (sql.includes("information_schema.COLUMNS"))
        return [params?.[1] === "owner_user_id" ? [] : [{ present: 1 }]];
      if (sql.includes("information_schema.STATISTICS")) return [[]];
      return [{ affectedRows: 1 }];
    });
    await initializeFitPlanDatabase();
    const queries = mock.execute.mock.calls.map(call => String(call[0]));
    const column = queries.findIndex(sql =>
      sql.includes("ADD COLUMN `owner_user_id` BIGINT UNSIGNED NULL")
    );
    const index = queries.findIndex(sql =>
      sql.includes("CREATE UNIQUE INDEX fit_plans_owner_user_uq")
    );
    expect(column).toBeGreaterThan(-1);
    expect(index).toBeGreaterThan(column);
    expect(
      queries.some(sql =>
        /DELETE|DROP TABLE|UPDATE fit_plan_progress|UPDATE fit_plans/.test(sql)
      )
    ).toBe(false);
    expect(mock.execute.mock.calls.at(-1)?.[1]).toEqual([2]);
  });

  it("filtra globales con owner NULL y rutinas privadas por owner e id", async () => {
    mock.execute.mockResolvedValue([[]]);
    await listFitPlans();
    await findFitPlan(plan.id);
    await findFitUserPlan(42, plan.id);
    await findFitPersonalPlan(42);
    expect(mock.execute.mock.calls[0][0]).toContain(
      "WHERE owner_user_id IS NULL"
    );
    expect(mock.execute.mock.calls[1][0]).toContain(
      "id = ? AND owner_user_id IS NULL"
    );
    expect(mock.execute.mock.calls[2][0]).toContain(
      "id = ? AND owner_user_id = ?"
    );
    expect(mock.execute.mock.calls[2][1]).toEqual([plan.id, 42]);
    expect(mock.execute.mock.calls[3][1]).toEqual([42]);
  });

  it("crea plan, matrícula y activo en una sola transacción del dueño", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ id: 42 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValue([{ affectedRows: 1 }]);
    expect((await saveFitPersonalPlan(input)).owner_user_id).toBe(42);
    const queries = mock.connection.execute.mock.calls;
    expect(queries[0][0]).toContain("fit_users WHERE id = ? FOR UPDATE");
    expect(queries[3][1]).toEqual([plan.id, 42, JSON.stringify(plan)]);
    expect(queries[4][1]).toEqual([42, plan.id, "2026-11-16", "beginner", 90]);
    expect(queries[5][1]).toEqual([42, plan.id]);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
    expect(mock.connection.rollback).not.toHaveBeenCalled();
    expect(mock.connection.release).toHaveBeenCalledOnce();
  });

  it("rechaza un segundo plan y revierte sin insertarlo", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ id: 42 }]])
      .mockResolvedValueOnce([[{ id: plan.id }]]);
    await expect(saveFitPersonalPlan(input)).rejects.toBeInstanceOf(
      FitPersonalPlanExistsError
    );
    expect(mock.connection.execute).toHaveBeenCalledTimes(2);
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
  });

  it("revierte creación si el índice único rechaza una carrera", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ id: 42 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(
        Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" })
      );
    await expect(saveFitPersonalPlan(input)).rejects.toThrow("duplicate");
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
    expect(mock.connection.release).toHaveBeenCalledOnce();
  });

  it("edita solo la fila propia sin progreso, conservando matrícula y fecha", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ id: plan.id }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValue([{ affectedRows: 1 }]);
    await updateFitPersonalPlan(42, plan);
    expect(mock.connection.execute.mock.calls[0][1]).toEqual([plan.id, 42]);
    expect(mock.connection.execute.mock.calls[1][1]).toEqual([42, plan.id]);
    expect(mock.connection.execute.mock.calls[2][1]).toEqual([
      JSON.stringify(plan),
      plan.id,
      42,
    ]);
    expect(
      mock.connection.execute.mock.calls.some(([sql]) =>
        String(sql).includes("fit_plan_enrollments")
      )
    ).toBe(false);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it.each(["sin dueño", "con historial"])(
    "rechaza edición %s bajo lock",
    async reason => {
      mock.connection.execute
        .mockResolvedValueOnce([
          reason === "sin dueño" ? [] : [{ id: plan.id }],
        ])
        .mockResolvedValueOnce([[{ present: 1 }]]);
      await expect(updateFitPersonalPlan(42, plan)).rejects.toBeInstanceOf(
        FitPersonalPlanLockedError
      );
      expect(
        mock.connection.execute.mock.calls.some(([sql]) =>
          String(sql).includes("UPDATE fit_plans")
        )
      ).toBe(false);
      expect(mock.connection.rollback).toHaveBeenCalledOnce();
      expect(mock.connection.commit).not.toHaveBeenCalled();
      expect(mock.connection.release).toHaveBeenCalledOnce();
    }
  );

  const progressInput = {
    userId: 42,
    planId: plan.id,
    dayKey: "w1-d7",
    sessionLevel: "beginner" as const,
    requiredSets: '["pp-d7-curl-barra:1"]',
    completedSets: "[]",
    cardioDone: false,
    warmupDone: true,
    completedAt: null,
    expectedPersonalPlan: plan,
  };
  it("guarda progreso personal bajo el mismo lock de la edición", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ payload: JSON.parse(JSON.stringify(plan)) }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    mock.execute.mockResolvedValue([[{ day_key: "w1-d7" }]]);
    await saveFitPlanProgress(progressInput);
    expect(mock.connection.execute.mock.calls[0][0]).toContain(
      "owner_user_id = ? FOR UPDATE"
    );
    expect(mock.connection.execute.mock.calls[0][1]).toEqual([plan.id, 42]);
    expect(mock.connection.execute.mock.calls[1][0]).toContain(
      "INSERT INTO fit_plan_progress"
    );
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it("rechaza progreso validado contra una versión vieja sin escribir sets incompatibles", async () => {
    mock.connection.execute.mockResolvedValueOnce([
      [{ payload: { ...plan, weeks: 8 } }],
    ]);
    await expect(saveFitPlanProgress(progressInput)).rejects.toBeInstanceOf(
      FitPersonalPlanLockedError
    );
    expect(mock.connection.execute).toHaveBeenCalledTimes(1);
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
  });
});
