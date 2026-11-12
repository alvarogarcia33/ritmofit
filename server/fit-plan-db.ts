import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { isDeepStrictEqual } from "node:util";
import { getFitPool } from "./fit-db";
import type { FitLevel } from "./fit-db";
import type { TrainingPlan } from "../shared/programs";

export const FIT_PLAN_SCHEMA_VERSION = 3;

export interface FitPlanRow extends RowDataPacket {
  id: string;
  owner_user_id: number | null;
  payload: string | TrainingPlan;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface FitPlanEnrollmentRow extends RowDataPacket {
  user_id: number;
  plan_id: string;
  start_date: string | Date;
  level: FitLevel;
  rest_seconds: number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface FitPersonalPlanVersionRow extends RowDataPacket {
  user_id: number;
  plan_id: string;
  version: number;
  plan_payload: string | TrainingPlan;
  progress_snapshot: string | FitPlanProgressRow[];
  start_date: string | Date;
  archived_at: string | Date;
}

export interface FitActivePlanRow extends RowDataPacket {
  user_id: number;
  plan_id: string;
  updated_at: string | Date;
}

export interface FitPlanProgressRow extends RowDataPacket {
  user_id: number;
  plan_id: string;
  day_key: string;
  session_level: FitLevel | null;
  required_sets: string | string[] | null;
  completed_sets: string | string[];
  cardio_done: number | boolean;
  warmup_done: number | boolean;
  completed_at: string | Date | null;
  updated_at: string | Date;
}

let initialization: Promise<void> | null = null;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for Ritmo Fit");
  return value;
}

function planPool() {
  // Keeping this check here makes accidental calls before the managed database is
  // configured fail with the same actionable message as the legacy Fit store.
  databaseUrl();
  return getFitPool();
}

async function selectRows<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await planPool().execute<T[]>(sql, params as any[]);
  return rows;
}

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await planPool().execute<ResultSetHeader>(
    sql,
    params as any[]
  );
  return result;
}

async function columnExists(
  tableName: string,
  columnName: string
): Promise<boolean> {
  const rows = await selectRows<RowDataPacket>(
    `
      SELECT 1 AS present
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
}

const TABLE_DEFINITIONS: Array<{
  name: string;
  create: string;
  columns: Array<{ name: string; definition: string }>;
}> = [
  {
    name: "fit_plans",
    create: `
      CREATE TABLE IF NOT EXISTS fit_plans (
        id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        owner_user_id BIGINT UNSIGNED NULL,
        payload JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY fit_plans_owner_user_uq (owner_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      {
        name: "id",
        definition:
          "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL",
      },
      { name: "owner_user_id", definition: "BIGINT UNSIGNED NULL" },
      { name: "payload", definition: "JSON NULL" },
      {
        name: "created_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
      {
        name: "updated_at",
        definition:
          "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)",
      },
    ],
  },
  {
    name: "fit_plan_enrollments",
    create: `
      CREATE TABLE IF NOT EXISTS fit_plan_enrollments (
        user_id BIGINT UNSIGNED NOT NULL,
        plan_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        start_date DATE NOT NULL,
        level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
        rest_seconds SMALLINT UNSIGNED NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, plan_id),
        KEY fit_plan_enrollments_plan_idx (plan_id),
        KEY fit_plan_enrollments_user_idx (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      {
        name: "plan_id",
        definition:
          "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL",
      },
      { name: "start_date", definition: "DATE NOT NULL DEFAULT '1970-01-01'" },
      {
        name: "level",
        definition:
          "ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner'",
      },
      {
        name: "rest_seconds",
        definition: "SMALLINT UNSIGNED NOT NULL DEFAULT 0",
      },
      {
        name: "created_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
      {
        name: "updated_at",
        definition:
          "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)",
      },
    ],
  },
  {
    name: "fit_personal_plan_versions",
    create: `
      CREATE TABLE IF NOT EXISTS fit_personal_plan_versions (
        user_id BIGINT UNSIGNED NOT NULL,
        plan_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        version INT UNSIGNED NOT NULL,
        plan_payload JSON NOT NULL,
        progress_snapshot JSON NOT NULL,
        start_date DATE NOT NULL,
        archived_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, plan_id, version),
        KEY fit_personal_versions_user_idx (user_id, archived_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      { name: "plan_id", definition: "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL" },
      { name: "version", definition: "INT UNSIGNED NOT NULL" },
      { name: "plan_payload", definition: "JSON NULL" },
      { name: "progress_snapshot", definition: "JSON NULL" },
      { name: "start_date", definition: "DATE NOT NULL DEFAULT '1970-01-01'" },
      { name: "archived_at", definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)" },
    ],
  },
  {
    name: "fit_active_plans",
    create: `
      CREATE TABLE IF NOT EXISTS fit_active_plans (
        user_id BIGINT UNSIGNED NOT NULL,
        plan_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      {
        name: "plan_id",
        definition:
          "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'adelgazar'",
      },
      {
        name: "updated_at",
        definition:
          "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)",
      },
    ],
  },
  {
    name: "fit_plan_progress",
    create: `
      CREATE TABLE IF NOT EXISTS fit_plan_progress (
        user_id BIGINT UNSIGNED NOT NULL,
        plan_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        day_key VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        session_level ENUM('beginner', 'intermediate', 'advanced') NULL,
        required_sets JSON NULL,
        completed_sets JSON NOT NULL,
        cardio_done TINYINT(1) NOT NULL DEFAULT 0,
        warmup_done TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, plan_id, day_key),
        KEY fit_plan_progress_user_idx (user_id),
        KEY fit_plan_progress_plan_idx (plan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      {
        name: "plan_id",
        definition:
          "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL",
      },
      {
        name: "day_key",
        definition:
          "VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'w1-d1'",
      },
      {
        name: "session_level",
        definition: "ENUM('beginner', 'intermediate', 'advanced') NULL",
      },
      { name: "required_sets", definition: "JSON NULL" },
      { name: "completed_sets", definition: "JSON NULL" },
      { name: "cardio_done", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "warmup_done", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "completed_at", definition: "DATETIME(3) NULL" },
      {
        name: "updated_at",
        definition:
          "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)",
      },
    ],
  },
];

/**
 * Creates only the additive plan tables. The receipt is separate from table
 * emptiness so startup never replaces catalog edits or user progress.
 */
export async function initializeFitPlanDatabase(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    const pool = planPool();
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fit_plan_schema_meta (
        schema_name VARCHAR(64) NOT NULL,
        version INT UNSIGNED NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (schema_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const table of TABLE_DEFINITIONS) {
      await pool.execute(table.create);
      for (const column of table.columns) {
        if (!(await columnExists(table.name, column.name))) {
          try {
            await pool.execute(
              `ALTER TABLE \`${table.name}\` ADD COLUMN \`${column.name}\` ${column.definition}`
            );
          } catch (error) {
            // Another new instance can complete the same additive DDL first.
            if (mysqlErrorCode(error) !== "ER_DUP_FIELDNAME") throw error;
          }
        }
      }
    }

    const [ownerIndexes] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 AS present FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
      ["fit_plans", "fit_plans_owner_user_uq"]
    );
    if (!ownerIndexes.length) {
      try {
        await pool.execute(
          "CREATE UNIQUE INDEX fit_plans_owner_user_uq ON fit_plans (owner_user_id)"
        );
      } catch (error) {
        if (mysqlErrorCode(error) !== "ER_DUP_KEYNAME") throw error;
      }
    }

    await pool.execute(
      `
        INSERT INTO fit_plan_schema_meta (schema_name, version, updated_at)
        VALUES ('fit-plans', ?, CURRENT_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE
          version = IF(version < VALUES(version), VALUES(version), version),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [FIT_PLAN_SCHEMA_VERSION]
    );
  })().catch(error => {
    initialization = null;
    throw error;
  });

  return initialization;
}

export async function listFitPlans(): Promise<FitPlanRow[]> {
  return selectRows<FitPlanRow>(
    `SELECT id, owner_user_id, payload, created_at, updated_at
     FROM fit_plans WHERE owner_user_id IS NULL ORDER BY created_at ASC, id ASC`
  );
}

export async function findFitPlan(id: string): Promise<FitPlanRow | null> {
  const rows = await selectRows<FitPlanRow>(
    `SELECT id, owner_user_id, payload, created_at, updated_at
     FROM fit_plans WHERE id = ? AND owner_user_id IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function insertFitPlan(
  id: string,
  plan: TrainingPlan
): Promise<FitPlanRow | null> {
  await execute(
    `INSERT INTO fit_plans (id, owner_user_id, payload) VALUES (?, NULL, CAST(? AS JSON))`,
    [id, JSON.stringify(plan)]
  );
  return findFitPlan(id);
}

export async function updateFitPlan(
  id: string,
  plan: TrainingPlan
): Promise<FitPlanRow | null> {
  await execute(
    `
      UPDATE fit_plans
      SET payload = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ? AND owner_user_id IS NULL
    `,
    [JSON.stringify(plan), id]
  );
  return findFitPlan(id);
}

export async function findFitUserPlan(
  userId: number,
  planId: string
): Promise<FitPlanRow | null> {
  const rows = await selectRows<FitPlanRow>(
    `SELECT id, owner_user_id, payload, created_at, updated_at
     FROM fit_plans WHERE id = ? AND owner_user_id = ? LIMIT 1`,
    [planId, userId]
  );
  return rows[0] ?? null;
}

export async function findFitPersonalPlan(
  userId: number
): Promise<FitPlanRow | null> {
  const rows = await selectRows<FitPlanRow>(
    `SELECT id, owner_user_id, payload, created_at, updated_at
     FROM fit_plans WHERE owner_user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function saveFitPersonalPlan(input: {
  userId: number;
  plan: TrainingPlan;
  startDate: string;
  level: FitLevel;
  restSeconds: number;
}): Promise<FitPlanRow> {
  const connection = await planPool().getConnection();
  let inTransaction = false;
  try {
    await connection.beginTransaction();
    inTransaction = true;
    const [users] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM fit_users WHERE id = ? FOR UPDATE",
      [input.userId]
    );
    if (!users[0]) throw new Error("Fit user not found");
    const [ownedPlans] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM fit_plans WHERE owner_user_id = ? FOR UPDATE",
      [input.userId]
    );
    if (ownedPlans[0]) throw new FitPersonalPlanExistsError();
    const [idCollision] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM fit_plans WHERE id = ? FOR UPDATE",
      [input.plan.id]
    );
    if (idCollision[0]) throw new Error("Fit plan id collision");
    await connection.execute(
      "INSERT INTO fit_plans (id, owner_user_id, payload) VALUES (?, ?, CAST(? AS JSON))",
      [input.plan.id, input.userId, JSON.stringify(input.plan)]
    );
    await connection.execute(
      `INSERT INTO fit_plan_enrollments
       (user_id, plan_id, start_date, level, rest_seconds, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
      [
        input.userId,
        input.plan.id,
        input.startDate,
        input.level,
        input.restSeconds,
      ]
    );
    await connection.execute(
      `INSERT INTO fit_active_plans (user_id, plan_id, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), updated_at = CURRENT_TIMESTAMP(3)`,
      [input.userId, input.plan.id]
    );
    await connection.commit();
    inTransaction = false;
    const now = new Date();
    return {
      id: input.plan.id,
      owner_user_id: input.userId,
      payload: input.plan,
      created_at: now,
      updated_at: now,
    } as FitPlanRow;
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export class FitPersonalPlanExistsError extends Error {
  constructor() {
    super("Personal plan already exists for this user");
    this.name = "FitPersonalPlanExistsError";
  }
}

export class FitPersonalPlanLockedError extends Error {
  constructor() {
    super("Personal plan has progress or changed concurrently");
    this.name = "FitPersonalPlanLockedError";
  }
}

export class FitPersonalPlanConflictError extends Error {
  constructor() {
    super("The personal plan changed since it was opened");
    this.name = "FitPersonalPlanConflictError";
  }
}

/** Return every archived edition belonging to this account, never by client ID. */
export async function listFitPersonalPlanVersions(
  userId: number,
  planId: string
): Promise<FitPersonalPlanVersionRow[]> {
  return selectRows<FitPersonalPlanVersionRow>(
    `SELECT user_id, plan_id, version, plan_payload, progress_snapshot,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, archived_at
       FROM fit_personal_plan_versions
      WHERE user_id = ? AND plan_id = ?
      ORDER BY version DESC`,
    [userId, planId]
  );
}

export async function currentFitPersonalPlanVersion(
  userId: number,
  planId: string
): Promise<number> {
  const rows = await selectRows<RowDataPacket>(
    `SELECT COALESCE(MAX(version), 0) + 1 AS current_version
       FROM fit_personal_plan_versions WHERE user_id = ? AND plan_id = ?`,
    [userId, planId]
  );
  return Number(rows[0]?.current_version ?? 1);
}

function readPlanPayload(value: string | TrainingPlan): TrainingPlan {
  return typeof value === "string" ? JSON.parse(value) : value;
}

/**
 * Serialize edits with personal progress writes on the plan row.
 * A changed routine archives the exact previous plan and its progress in
 * the same transaction. The new cycle starts with clean day keys, while
 * earlier sessions remain retrievable under their original exercises/dates.
 * No user data is deleted unless its archive insert succeeds atomically.
 */
export async function updateFitPersonalPlan(
  userId: number,
  plan: TrainingPlan,
  expectedPlan: TrainingPlan,
  nextStartDate: string
): Promise<{ archived: boolean; version: number; restarted: boolean }> {
  const connection = await planPool().getConnection();
  let inTransaction = false;
  try {
    await connection.beginTransaction();
    inTransaction = true;
    const [owned] = await connection.execute<FitPlanRow[]>(
      "SELECT payload FROM fit_plans WHERE id = ? AND owner_user_id = ? FOR UPDATE",
      [plan.id, userId]
    );
    if (!owned[0]) throw new FitPersonalPlanLockedError();
    const stored = readPlanPayload(owned[0].payload);
    if (!isDeepStrictEqual(stored, expectedPlan))
      throw new FitPersonalPlanConflictError();

    const [lastVersions] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(version), 0) AS last_version
         FROM fit_personal_plan_versions
        WHERE user_id = ? AND plan_id = ?`,
      [userId, plan.id]
    );
    const previousVersion = Number(lastVersions[0]?.last_version ?? 0) + 1;
    if (isDeepStrictEqual(stored, plan)) {
      await connection.commit();
      inTransaction = false;
      return { archived: false, version: previousVersion, restarted: false };
    }

    const [enrollments] = await connection.execute<FitPlanEnrollmentRow[]>(
      "SELECT DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date FROM fit_plan_enrollments WHERE user_id = ? AND plan_id = ? FOR UPDATE",
      [userId, plan.id]
    );
    if (!enrollments[0]) throw new Error("Personal plan enrollment not found");
    const [progress] = await connection.execute<FitPlanProgressRow[]>(
      `SELECT ${PLAN_PROGRESS_COLUMNS} FROM fit_plan_progress
         WHERE user_id = ? AND plan_id = ? FOR UPDATE`,
      [userId, plan.id]
    );
    const restarted = progress.length > 0;
    await connection.execute(
      `INSERT INTO fit_personal_plan_versions
         (user_id, plan_id, version, plan_payload, progress_snapshot, start_date)
       VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?)`,
      [
        userId,
        plan.id,
        previousVersion,
        JSON.stringify(stored),
        JSON.stringify(progress),
        enrollments[0].start_date,
      ]
    );

    if (restarted) {
      await connection.execute(
        "DELETE FROM fit_plan_progress WHERE user_id = ? AND plan_id = ?",
        [userId, plan.id]
      );
      await connection.execute(
        `UPDATE fit_plan_enrollments
            SET start_date = ?, updated_at = CURRENT_TIMESTAMP(3)
          WHERE user_id = ? AND plan_id = ?`,
        [nextStartDate, userId, plan.id]
      );
    }
    await connection.execute(
      "UPDATE fit_plans SET payload = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND owner_user_id = ?",
      [JSON.stringify(plan), plan.id, userId]
    );
    await connection.execute(
      `INSERT INTO fit_active_plans (user_id, plan_id, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), updated_at = CURRENT_TIMESTAMP(3)`,
      [userId, plan.id]
    );
    await connection.commit();
    inTransaction = false;
    return { archived: true, version: previousVersion + 1, restarted };
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function migrateFitPlanDayMediaOnce(
  migrationName: string,
  planId: string,
  defaultPlan: TrainingPlan,
  dayNumber: number,
  replacePlanExerciseMediaFromDefault: (
    storedPlan: TrainingPlan,
    defaultPlan: TrainingPlan,
    dayNumber: number
  ) => { plan: TrainingPlan; updatedExerciseIds: string[] }
): Promise<string[]> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(migrationName))
    throw new Error("Invalid fit-plan migration name");
  const connection = await planPool().getConnection();
  let inTransaction = false;
  try {
    await connection.beginTransaction();
    inTransaction = true;
    await connection.execute(
      `INSERT IGNORE INTO fit_plan_schema_meta (schema_name, version, updated_at)
       VALUES (?, 0, CURRENT_TIMESTAMP(3))`,
      [migrationName]
    );
    const [markerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT version FROM fit_plan_schema_meta WHERE schema_name = ? FOR UPDATE`,
      [migrationName]
    );
    if (Number(markerRows[0]?.version ?? 0) >= 1) {
      await connection.commit();
      inTransaction = false;
      return [];
    }
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT payload FROM fit_plans WHERE id = ? FOR UPDATE`,
      [planId]
    );
    if (!planRows[0]) {
      await connection.rollback();
      inTransaction = false;
      return [];
    }
    const payload = planRows[0].payload;
    const storedPlan = (
      typeof payload === "string" ? JSON.parse(payload) : payload
    ) as TrainingPlan;
    const result = replacePlanExerciseMediaFromDefault(
      storedPlan,
      defaultPlan,
      dayNumber
    );
    if (result.updatedExerciseIds.length) {
      await connection.execute(
        `UPDATE fit_plans
         SET payload = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [JSON.stringify(result.plan), planId]
      );
    }
    await connection.execute(
      `UPDATE fit_plan_schema_meta SET version = 1, updated_at = CURRENT_TIMESTAMP(3)
       WHERE schema_name = ?`,
      [migrationName]
    );
    await connection.commit();
    inTransaction = false;
    return result.updatedExerciseIds;
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function migrateFitPlanCoverOnce(
  migrationName: string,
  planId: string,
  coverImage: string
): Promise<boolean> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(migrationName))
    throw new Error("Invalid fit-plan migration name");
  const connection = await planPool().getConnection();
  let inTransaction = false;
  try {
    await connection.beginTransaction();
    inTransaction = true;
    await connection.execute(
      `INSERT IGNORE INTO fit_plan_schema_meta (schema_name, version, updated_at)
       VALUES (?, 0, CURRENT_TIMESTAMP(3))`,
      [migrationName]
    );
    const [markers] = await connection.execute<RowDataPacket[]>(
      `SELECT version FROM fit_plan_schema_meta WHERE schema_name = ? FOR UPDATE`,
      [migrationName]
    );
    if (Number(markers[0]?.version ?? 0) >= 1) {
      await connection.commit();
      inTransaction = false;
      return false;
    }
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE fit_plans
       SET payload = JSON_SET(payload, '$.coverImage', ?),
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [coverImage, planId]
    );
    if (!result.affectedRows) {
      await connection.rollback();
      inTransaction = false;
      return false;
    }
    await connection.execute(
      `UPDATE fit_plan_schema_meta SET version = 1, updated_at = CURRENT_TIMESTAMP(3)
       WHERE schema_name = ?`,
      [migrationName]
    );
    await connection.commit();
    inTransaction = false;
    return true;
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function seedDefaultFitPlans(
  defaults: TrainingPlan[]
): Promise<void> {
  for (const plan of defaults) {
    const existing = await findFitPlan(plan.id);
    if (existing) continue;
    try {
      await insertFitPlan(plan.id, plan);
    } catch (error) {
      // A concurrent startup may have inserted the same default. Do not turn
      // an otherwise safe, idempotent seed into a startup failure.
      if (!isDuplicateError(error)) throw error;
    }
  }
}

function isDuplicateError(error: unknown): boolean {
  return mysqlErrorCode(error) === "ER_DUP_ENTRY";
}

function mysqlErrorCode(error: unknown): unknown {
  return error && typeof error === "object" && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
}

function enrollmentColumns(): string {
  return `user_id, plan_id, start_date, level, rest_seconds, created_at, updated_at`;
}

export async function listFitPlanEnrollments(
  userId: number
): Promise<FitPlanEnrollmentRow[]> {
  return selectRows<FitPlanEnrollmentRow>(
    `
      SELECT ${enrollmentColumns()}
      FROM fit_plan_enrollments
      WHERE user_id = ?
      ORDER BY plan_id ASC
    `,
    [userId]
  );
}

export async function findFitPlanEnrollment(
  userId: number,
  planId: string
): Promise<FitPlanEnrollmentRow | null> {
  const rows = await selectRows<FitPlanEnrollmentRow>(
    `
      SELECT ${enrollmentColumns()}
      FROM fit_plan_enrollments
      WHERE user_id = ? AND plan_id = ?
      LIMIT 1
    `,
    [userId, planId]
  );
  return rows[0] ?? null;
}

export async function saveFitPlanEnrollment(input: {
  userId: number;
  planId: string;
  startDate: string;
  level: FitLevel;
  restSeconds: number;
}): Promise<FitPlanEnrollmentRow | null> {
  await execute(
    `
      INSERT INTO fit_plan_enrollments
        (user_id, plan_id, start_date, level, rest_seconds, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        start_date = VALUES(start_date),
        level = VALUES(level),
        rest_seconds = VALUES(rest_seconds),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [
      input.userId,
      input.planId,
      input.startDate,
      input.level,
      input.restSeconds,
    ]
  );
  return findFitPlanEnrollment(input.userId, input.planId);
}

export async function findFitActivePlan(
  userId: number
): Promise<FitActivePlanRow | null> {
  const rows = await selectRows<FitActivePlanRow>(
    `
      SELECT user_id, plan_id, updated_at
      FROM fit_active_plans
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function saveFitActivePlan(
  userId: number,
  planId: string
): Promise<void> {
  await execute(
    `
      INSERT INTO fit_active_plans (user_id, plan_id, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        plan_id = VALUES(plan_id),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [userId, planId]
  );
}

const PLAN_PROGRESS_COLUMNS = `
  user_id, plan_id, day_key, session_level, required_sets, completed_sets,
  cardio_done, warmup_done, completed_at, updated_at
`;

export async function listFitPlanProgress(
  userId: number,
  planId: string
): Promise<FitPlanProgressRow[]> {
  return selectRows<FitPlanProgressRow>(
    `
      SELECT ${PLAN_PROGRESS_COLUMNS}
      FROM fit_plan_progress
      WHERE user_id = ? AND plan_id = ?
      ORDER BY day_key ASC
    `,
    [userId, planId]
  );
}

export async function findFitPlanProgress(
  userId: number,
  planId: string,
  dayKey: string
): Promise<FitPlanProgressRow | null> {
  const rows = await selectRows<FitPlanProgressRow>(
    `
      SELECT ${PLAN_PROGRESS_COLUMNS}
      FROM fit_plan_progress
      WHERE user_id = ? AND plan_id = ? AND day_key = ?
      LIMIT 1
    `,
    [userId, planId, dayKey]
  );
  return rows[0] ?? null;
}

export async function saveFitPlanProgress(input: {
  userId: number;
  planId: string;
  dayKey: string;
  sessionLevel: FitLevel;
  requiredSets: string;
  completedSets: string;
  cardioDone: boolean;
  warmupDone: boolean;
  completedAt: Date | null;
  expectedPersonalPlan?: TrainingPlan;
}): Promise<FitPlanProgressRow | null> {
  const connection = input.expectedPersonalPlan
    ? await planPool().getConnection()
    : null;
  let inTransaction = false;
  try {
    if (connection) {
      await connection.beginTransaction();
      inTransaction = true;
      const [owned] = await connection.execute<RowDataPacket[]>(
        "SELECT payload FROM fit_plans WHERE id = ? AND owner_user_id = ? FOR UPDATE",
        [input.planId, input.userId]
      );
      const payload = owned[0]?.payload;
      const stored =
        typeof payload === "string" ? JSON.parse(payload) : payload;
      if (!isDeepStrictEqual(stored, input.expectedPersonalPlan))
        throw new FitPersonalPlanLockedError();
    }
    const sql = `
      INSERT INTO fit_plan_progress
        (
          user_id, plan_id, day_key, session_level, required_sets,
          completed_sets, cardio_done, warmup_done, completed_at, updated_at
        )
      VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        session_level = COALESCE(session_level, VALUES(session_level)),
        required_sets = COALESCE(required_sets, VALUES(required_sets)),
        completed_sets = VALUES(completed_sets),
        cardio_done = VALUES(cardio_done),
        warmup_done = VALUES(warmup_done),
        completed_at = IF(
          VALUES(completed_at) IS NULL,
          NULL,
          COALESCE(completed_at, VALUES(completed_at))
        ),
        updated_at = CURRENT_TIMESTAMP(3)
    `;
    const params = [
      input.userId,
      input.planId,
      input.dayKey,
      input.sessionLevel,
      input.requiredSets,
      input.completedSets,
      input.cardioDone ? 1 : 0,
      input.warmupDone ? 1 : 0,
      input.completedAt,
    ];
    if (connection) {
      await connection.execute(sql, params);
      await connection.commit();
      inTransaction = false;
    } else {
      await execute(sql, params);
    }
  } catch (error) {
    if (connection && inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection?.release();
  }
  return findFitPlanProgress(input.userId, input.planId, input.dayKey);
}

export async function hasFitPlanProgress(
  userId: number,
  planId: string
): Promise<boolean> {
  const rows = await selectRows<RowDataPacket>(
    `
      SELECT 1 AS present
      FROM fit_plan_progress
      WHERE user_id = ? AND plan_id = ?
      LIMIT 1
    `,
    [userId, planId]
  );
  return rows.length > 0;
}

export async function hasAnyFitPlanProgress(planId: string): Promise<boolean> {
  const rows = await selectRows<RowDataPacket>(
    `
      SELECT 1 AS present
      FROM fit_plan_progress
      WHERE plan_id = ?
      LIMIT 1
    `,
    [planId]
  );
  return rows.length > 0;
}
