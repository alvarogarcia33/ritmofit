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
  FitPersonalPlanConflictError,
  listFitPersonalPlanVersions,
  currentFitPersonalPlanVersion,
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
    expect(mock.execute.mock.calls.at(-1)?.[1]).toEqual([5]);
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

  const updated = {
    ...plan,
    routine: {
      first: plan.routine.first.map(day => ({
        ...day,
        exercises: day.exercises.map(exercise => ({
          ...exercise,
          sets: 4,
        })),
      })),
      second: plan.routine.second.map(day => ({
        ...day,
        exercises: day.exercises.map(exercise => ({
          ...exercise,
          sets: 4,
        })),
      })),
    },
  };

  it("edita una rutina sin progreso, archiva su versión y mantiene su matrícula", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ payload: plan }]])
      .mockResolvedValueOnce([[{ last_version: 0 }]])
      .mockResolvedValueOnce([[{ start_date: "2026-11-16" }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValue([{ affectedRows: 1 }]);
    const result = await updateFitPersonalPlan(42, updated, plan, "2026-11-23");
    expect(result).toEqual({ archived: true, version: 2, restarted: false });
    const queries = mock.connection.execute.mock.calls;
    expect(queries[0][0]).toContain("owner_user_id = ? FOR UPDATE");
    expect(queries.some(([sql]) => String(sql).includes("INSERT INTO fit_personal_plan_versions"))).toBe(true);
    expect(queries.some(([sql]) => String(sql).includes("DELETE FROM fit_plan_progress"))).toBe(false);
    expect(queries.some(([sql]) => String(sql).includes("UPDATE fit_plan_enrollments"))).toBe(false);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it("archiva sesiones completas y parciales antes de reiniciar el ciclo en una transacción", async () => {
    const previousProgress = [
      {
        user_id: 42, plan_id: plan.id, day_key: "w1-d7",
        session_level: "beginner", required_sets: '["pp-d7-curl-barra:1"]',
        completed_sets: '["pp-d7-curl-barra:1"]',
        set_performance: '[{"setKey":"pp-d7-curl-barra:1","weightKg":30,"reps":12}]',
        warmup_done: 1, cardio_done: 0,
        completed_at: "2026-11-22T15:00:00Z",
        updated_at: "2026-11-22T15:00:00Z",
      },
    ];
    mock.connection.execute
      .mockResolvedValueOnce([[{ payload: plan }]])
      .mockResolvedValueOnce([[{ last_version: 2 }]])
      .mockResolvedValueOnce([[{ start_date: "2026-11-16" }]])
      .mockResolvedValueOnce([previousProgress])
      .mockResolvedValue([{ affectedRows: 1 }]);
    const result = await updateFitPersonalPlan(42, updated, plan, "2026-11-23");
    expect(result).toEqual({ archived: true, version: 4, restarted: true });
    const calls = mock.connection.execute.mock.calls;
    const archiveIndex = calls.findIndex(([sql]) => String(sql).includes("INSERT INTO fit_personal_plan_versions"));
    const deleteIndex = calls.findIndex(([sql]) => String(sql).includes("DELETE FROM fit_plan_progress"));
    const restartIndex = calls.findIndex(([sql]) => String(sql).includes("UPDATE fit_plan_enrollments"));
    expect(archiveIndex).toBeGreaterThan(-1);
    expect(deleteIndex).toBeGreaterThan(archiveIndex);
    expect(restartIndex).toBeGreaterThan(deleteIndex);
    expect(calls[archiveIndex][1]).toEqual([
      42, plan.id, 3, JSON.stringify(plan),
      JSON.stringify(previousProgress), "2026-11-16",
    ]);
    expect(JSON.parse(calls[archiveIndex][1][4])[0].set_performance)
      .toContain('"weightKg":30');
    expect(calls[restartIndex][1]).toEqual(["2026-11-23", 42, plan.id]);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it("no archiva ni reinicia cuando la edición no cambió nada", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ payload: plan }]])
      .mockResolvedValueOnce([[{ last_version: 1 }]]);
    const result = await updateFitPersonalPlan(42, plan, plan, "2026-11-23");
    expect(result).toEqual({ archived: false, version: 2, restarted: false });
    expect(mock.connection.execute).toHaveBeenCalledTimes(2);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it("rechaza ediciones de otro dueño o de una versión obsoleta", async () => {
    mock.connection.execute.mockResolvedValueOnce([[]]);
    await expect(updateFitPersonalPlan(42, updated, plan, "2026-11-23"))
      .rejects.toBeInstanceOf(FitPersonalPlanLockedError);
    mock.connection.execute.mockReset();
    mock.connection.execute.mockResolvedValueOnce([[{ payload: updated }]]);
    await expect(updateFitPersonalPlan(42, updated, plan, "2026-11-23"))
      .rejects.toBeInstanceOf(FitPersonalPlanConflictError);
    expect(mock.connection.rollback).toHaveBeenCalledTimes(2);
    expect(mock.connection.commit).not.toHaveBeenCalled();
  });

  it("revierte la edición cuando falla la escritura de la versión anterior", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([[{ payload: plan }]])
      .mockResolvedValueOnce([[{ last_version: 0 }]])
      .mockResolvedValueOnce([[{ start_date: "2026-11-16" }]])
      .mockResolvedValueOnce([[{ day_key: "w1-d7", completed_sets: ["x:1"] }]])
      .mockRejectedValueOnce(new Error("archive insert failed"));
    await expect(updateFitPersonalPlan(42, updated, plan, "2026-11-23"))
      .rejects.toThrow("archive insert failed");
    expect(mock.connection.execute.mock.calls.some(([sql]) =>
      String(sql).includes("DELETE FROM fit_plan_progress")
    )).toBe(false);
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
  });

  it("consulta versiones solo del titular de la cuenta", async () => {
    mock.execute.mockResolvedValueOnce([[{ current_version: 4 }]])
      .mockResolvedValueOnce([[{ version: 3, user_id: 42 }]]);
    expect(await currentFitPersonalPlanVersion(42, plan.id)).toBe(4);
    expect(await listFitPersonalPlanVersions(42, plan.id)).toHaveLength(1);
    expect(mock.execute.mock.calls[0][1]).toEqual([42, plan.id]);
    expect(mock.execute.mock.calls[1][1]).toEqual([42, plan.id]);
  });

  const progressInput = {
    userId: 42,
    planId: plan.id,
    dayKey: "w1-d7",
    sessionLevel: "beginner" as const,
    requiredSets: '["pp-d7-curl-barra:1"]',
    completedSets: "[]",
    setPerformance: '[]',
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
