import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  connection: {
    beginTransaction: vi.fn(),
    execute: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  },
  getConnection: vi.fn(),
}));
vi.mock("./fit-db", () => ({
  getFitPool: () => ({ getConnection: mock.getConnection }),
}));
import { migrateFitPlanCoverOnce } from "./fit-plan-db";

const cover = "/manus-storage/async-images/VwMfzeRAmktLUa0hud9r3g/image-1.webp";
const marker = "tonificar-cover-art-vwmfze-2026-11-10";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "mysql://unit-test-not-used");
  mock.connection.execute.mockReset();
  mock.getConnection.mockResolvedValue(mock.connection);
});
afterEach(() => vi.unstubAllEnvs());

describe("Migración aislada de portada de Tonificar", () => {
  it("actualiza solo coverImage y deja un marcador transaccional", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ version: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    expect(await migrateFitPlanCoverOnce(marker, "tonificar", cover)).toBe(
      true
    );
    const queries = mock.connection.execute.mock.calls;
    expect(queries[2][0]).toContain("JSON_SET(payload, '$.coverImage', ?)");
    expect(queries[2][1]).toEqual([cover, "tonificar"]);
    expect(queries[3][1]).toEqual([marker]);
    expect(
      queries.every(([sql]) => !String(sql).includes("fit_plan_progress"))
    ).toBe(true);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
    expect(mock.connection.rollback).not.toHaveBeenCalled();
    expect(mock.connection.release).toHaveBeenCalledOnce();
  });

  it("no sobrescribe ediciones administrativas cuando ya se ejecutó", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([[{ version: 1 }]]);
    expect(await migrateFitPlanCoverOnce(marker, "tonificar", cover)).toBe(
      false
    );
    expect(mock.connection.execute).toHaveBeenCalledTimes(2);
    expect(mock.connection.commit).toHaveBeenCalledOnce();
  });

  it("no marca una migración si el plan no existe", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ version: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    expect(await migrateFitPlanCoverOnce(marker, "tonificar", cover)).toBe(
      false
    );
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
    expect(mock.connection.release).toHaveBeenCalledOnce();
  });

  it("revierte ante un fallo de actualización y libera la conexión", async () => {
    mock.connection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ version: 0 }]])
      .mockRejectedValueOnce(new Error("update failed"));
    await expect(
      migrateFitPlanCoverOnce(marker, "tonificar", cover)
    ).rejects.toThrow("update failed");
    expect(mock.connection.rollback).toHaveBeenCalledOnce();
    expect(mock.connection.commit).not.toHaveBeenCalled();
    expect(mock.connection.release).toHaveBeenCalledOnce();
  });
});
