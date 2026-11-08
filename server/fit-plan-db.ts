import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getFitPool } from "./fit-db";
import type { FitLevel } from "./fit-db";
import type { TrainingPlan } from "../shared/programs";

export const FIT_PLAN_SCHEMA_VERSION = 1;

export interface FitPlanRow extends RowDataPacket {
  id: string;
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
        payload JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      {
        name: "id",
        definition:
          "VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL",
      },
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
          await pool.execute(
            `ALTER TABLE \`${table.name}\` ADD COLUMN \`${column.name}\` ${column.definition}`
          );
        }
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
    `SELECT id, payload, created_at, updated_at FROM fit_plans ORDER BY created_at ASC, id ASC`
  );
}

export async function findFitPlan(id: string): Promise<FitPlanRow | null> {
  const rows = await selectRows<FitPlanRow>(
    `SELECT id, payload, created_at, updated_at FROM fit_plans WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function insertFitPlan(
  id: string,
  plan: TrainingPlan
): Promise<FitPlanRow | null> {
  await execute(
    `INSERT INTO fit_plans (id, payload) VALUES (?, CAST(? AS JSON))`,
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
      WHERE id = ?
    `,
    [JSON.stringify(plan), id]
  );
  return findFitPlan(id);
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
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
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
}): Promise<FitPlanProgressRow | null> {
  await execute(
    `
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
    `,
    [
      input.userId,
      input.planId,
      input.dayKey,
      input.sessionLevel,
      input.requiredSets,
      input.completedSets,
      input.cardioDone ? 1 : 0,
      input.warmupDone ? 1 : 0,
      input.completedAt,
    ]
  );
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
