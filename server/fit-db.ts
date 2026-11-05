import { createPool } from "mysql2/promise";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const FIT_SCHEMA_VERSION = 1;

export type FitRole = "user" | "admin";
export type FitLevel = "beginner" | "intermediate" | "advanced";

export interface FitUserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  full_name: string;
  password_hash: string;
  role: FitRole;
  level: FitLevel;
  start_date: string | Date;
  reminder_time: string | Date;
  reminders_enabled: number | boolean;
  timezone: string;
  created_at: string | Date;
  updated_at: string | Date;
  last_login: string | Date | null;
}

export interface FitProgressRow extends RowDataPacket {
  user_id: number;
  day_key: string;
  session_level: FitLevel | null;
  completed_sets: string;
  cardio_done: number | boolean;
  warmup_done: number | boolean;
  completed_at: string | Date | null;
  updated_at: string | Date;
}

export interface FitContentRow extends RowDataPacket {
  exercise_id: string;
  name: string;
  video_url: string;
  tips: string;
}

export interface NewFitUser {
  email: string;
  username: string;
  fullName: string;
  passwordHash: string;
  role?: FitRole;
  level?: FitLevel;
  startDate: string;
  reminderTime?: string;
  remindersEnabled?: boolean;
  timezone: string;
}

export interface FitUserUpdate {
  fullName?: string;
  email?: string;
  level?: FitLevel;
  startDate?: string;
  reminderTime?: string;
  remindersEnabled?: boolean;
  timezone?: string;
}

let fitPool: Pool | null = null;
let initialization: Promise<void> | null = null;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required for Ritmo Fit");
  }
  return value;
}

export function getFitPool(): Pool {
  if (!fitPool) {
    // DATABASE_URL is supplied by the managed database or the selected external database.
    fitPool = createPool(databaseUrl());
  }
  return fitPool;
}

export async function closeFitPool(): Promise<void> {
  if (fitPool) {
    const pool = fitPool;
    fitPool = null;
    initialization = null;
    await pool.end();
  }
}

const TABLE_DEFINITIONS: Array<{
  name: string;
  create: string;
  columns: Array<{ name: string; definition: string }>;
}> = [
  {
    name: "fit_users",
    create: `
      CREATE TABLE IF NOT EXISTS fit_users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(254) NOT NULL,
        username VARCHAR(30) NOT NULL,
        full_name VARCHAR(80) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
        start_date DATE NOT NULL,
        reminder_time TIME NOT NULL DEFAULT '09:00:00',
        reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
        timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        last_login DATETIME(3) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY fit_users_email_uq (email),
        UNIQUE KEY fit_users_username_uq (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "email", definition: "VARCHAR(254) NOT NULL DEFAULT ''" },
      { name: "username", definition: "VARCHAR(30) NOT NULL DEFAULT ''" },
      { name: "full_name", definition: "VARCHAR(80) NOT NULL DEFAULT ''" },
      { name: "password_hash", definition: "VARCHAR(255) NOT NULL DEFAULT ''" },
      {
        name: "role",
        definition: "ENUM('user', 'admin') NOT NULL DEFAULT 'user'",
      },
      {
        name: "level",
        definition:
          "ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner'",
      },
      { name: "start_date", definition: "DATE NOT NULL DEFAULT '1970-01-01'" },
      { name: "reminder_time", definition: "TIME NOT NULL DEFAULT '09:00:00'" },
      {
        name: "reminders_enabled",
        definition: "TINYINT(1) NOT NULL DEFAULT 1",
      },
      { name: "timezone", definition: "VARCHAR(64) NOT NULL DEFAULT 'UTC'" },
      {
        name: "created_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
      {
        name: "updated_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
      { name: "last_login", definition: "DATETIME(3) NULL" },
    ],
  },
  {
    name: "fit_sessions",
    create: `
      CREATE TABLE IF NOT EXISTS fit_sessions (
        token_hash CHAR(64) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (token_hash),
        KEY fit_sessions_user_idx (user_id),
        KEY fit_sessions_expiry_idx (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "token_hash", definition: "CHAR(64) NOT NULL" },
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      { name: "expires_at", definition: "DATETIME(3) NOT NULL" },
      {
        name: "created_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
    ],
  },
  {
    name: "fit_progress",
    create: `
      CREATE TABLE IF NOT EXISTS fit_progress (
        user_id BIGINT UNSIGNED NOT NULL,
        day_key VARCHAR(5) NOT NULL,
        session_level ENUM('beginner', 'intermediate', 'advanced') NULL,
        completed_sets JSON NOT NULL,
        cardio_done TINYINT(1) NOT NULL DEFAULT 0,
        warmup_done TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (user_id, day_key),
        KEY fit_progress_user_idx (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "user_id", definition: "BIGINT UNSIGNED NOT NULL" },
      { name: "day_key", definition: "VARCHAR(5) NOT NULL" },
      {
        name: "session_level",
        definition: "ENUM('beginner', 'intermediate', 'advanced') NULL",
      },
      { name: "completed_sets", definition: "JSON NOT NULL" },
      { name: "cardio_done", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "warmup_done", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "completed_at", definition: "DATETIME(3) NULL" },
      {
        name: "updated_at",
        definition: "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
      },
    ],
  },
  {
    name: "fit_content",
    create: `
      CREATE TABLE IF NOT EXISTS fit_content (
        exercise_id VARCHAR(20) NOT NULL,
        name VARCHAR(140) NOT NULL,
        video_url VARCHAR(2048) NOT NULL,
        tips TEXT NOT NULL,
        PRIMARY KEY (exercise_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    columns: [
      { name: "exercise_id", definition: "VARCHAR(20) NOT NULL" },
      { name: "name", definition: "VARCHAR(140) NOT NULL" },
      { name: "video_url", definition: "VARCHAR(2048) NOT NULL" },
      { name: "tips", definition: "TEXT NOT NULL" },
    ],
  },
];

async function columnExists(
  tableName: string,
  columnName: string
): Promise<boolean> {
  const [rows] = await getFitPool().execute<RowDataPacket[]>(
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

/**
 * Creates the Fit tables and adds missing columns without dropping or replacing user data.
 * The schema receipt is separate from table emptiness so a restart never reseeds user edits.
 */
export async function initializeFitDatabase(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    const pool = getFitPool();
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS fit_schema_meta (
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
        INSERT INTO fit_schema_meta (schema_name, version, updated_at)
        VALUES ('fit', ?, CURRENT_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE
          version = IF(version < VALUES(version), VALUES(version), version),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [FIT_SCHEMA_VERSION]
    );
  })().catch(error => {
    initialization = null;
    throw error;
  });

  return initialization;
}

async function selectRows<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await getFitPool().execute<T[]>(sql, params as any[]);
  return rows;
}

async function execute(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await getFitPool().execute<ResultSetHeader>(
    sql,
    params as any[]
  );
  return result;
}

const USER_COLUMNS = `
  id, email, username, full_name, password_hash, role, level,
  start_date, reminder_time, reminders_enabled, timezone,
  created_at, updated_at, last_login
`;
const USER_COLUMNS_WITH_ALIAS = USER_COLUMNS.split(",")
  .map(column => `u.${column.trim()}`)
  .join(", ");

export async function insertFitUser(input: NewFitUser): Promise<number> {
  const result = await execute(
    `
      INSERT INTO fit_users
        (email, username, full_name, password_hash, role, level, start_date,
         reminder_time, reminders_enabled, timezone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.email,
      input.username,
      input.fullName,
      input.passwordHash,
      input.role ?? "user",
      input.level ?? "beginner",
      input.startDate,
      input.reminderTime ?? "09:00",
      input.remindersEnabled === false ? 0 : 1,
      input.timezone,
    ]
  );
  return Number(result.insertId);
}

export async function findFitUserById(
  id: number | string
): Promise<FitUserRow | null> {
  const rows = await selectRows<FitUserRow>(
    `SELECT ${USER_COLUMNS} FROM fit_users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findFitUserByUsername(
  username: string
): Promise<FitUserRow | null> {
  const rows = await selectRows<FitUserRow>(
    `SELECT ${USER_COLUMNS} FROM fit_users WHERE username = ? LIMIT 1`,
    [username]
  );
  return rows[0] ?? null;
}

export async function findFitUserByEmail(
  email: string
): Promise<FitUserRow | null> {
  const rows = await selectRows<FitUserRow>(
    `SELECT ${USER_COLUMNS} FROM fit_users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function listFitUsers(): Promise<FitUserRow[]> {
  return selectRows<FitUserRow>(
    `SELECT ${USER_COLUMNS} FROM fit_users ORDER BY id ASC`
  );
}

export async function updateFitUser(
  id: number,
  updates: FitUserUpdate
): Promise<FitUserRow | null> {
  const values: unknown[] = [];
  const assignments: string[] = [];
  const add = (column: string, value: unknown) => {
    assignments.push(`${column} = ?`);
    values.push(value);
  };

  if (updates.fullName !== undefined) add("full_name", updates.fullName);
  if (updates.email !== undefined) add("email", updates.email);
  if (updates.level !== undefined) add("level", updates.level);
  if (updates.startDate !== undefined) add("start_date", updates.startDate);
  if (updates.reminderTime !== undefined)
    add("reminder_time", updates.reminderTime);
  if (updates.remindersEnabled !== undefined)
    add("reminders_enabled", updates.remindersEnabled ? 1 : 0);
  if (updates.timezone !== undefined) add("timezone", updates.timezone);

  if (assignments.length > 0) {
    values.push(id);
    await execute(
      `UPDATE fit_users SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      values
    );
  }
  return findFitUserById(id);
}

export async function setFitLastLogin(id: number): Promise<void> {
  await execute(
    `UPDATE fit_users SET last_login = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [id]
  );
}

export async function updateFitPasswordAndRevokeOtherSessions(
  userId: number,
  passwordHash: string,
  currentTokenHash: string
): Promise<void> {
  const connection = await getFitPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE fit_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [passwordHash, userId]
    );
    await connection.execute(
      `DELETE FROM fit_sessions WHERE user_id = ? AND token_hash <> ?`,
      [userId, currentTokenHash]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function insertFitSession(
  tokenHash: string,
  userId: number,
  expiresAt: Date
): Promise<void> {
  await execute(
    `INSERT INTO fit_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
    [tokenHash, userId, expiresAt]
  );
}

export async function findFitUserBySessionHash(
  tokenHash: string
): Promise<FitUserRow | null> {
  const rows = await selectRows<FitUserRow>(
    `
      SELECT ${USER_COLUMNS_WITH_ALIAS}
      FROM fit_sessions s
      INNER JOIN fit_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1
    `,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export async function deleteFitSession(tokenHash: string): Promise<void> {
  await execute(`DELETE FROM fit_sessions WHERE token_hash = ?`, [tokenHash]);
}

export async function listFitProgress(
  userId: number
): Promise<FitProgressRow[]> {
  return selectRows<FitProgressRow>(
    `
      SELECT user_id, day_key, session_level, completed_sets, cardio_done, warmup_done, completed_at, updated_at
      FROM fit_progress WHERE user_id = ? ORDER BY day_key ASC
    `,
    [userId]
  );
}

export async function findFitProgress(
  userId: number,
  dayKey: string
): Promise<FitProgressRow | null> {
  const rows = await selectRows<FitProgressRow>(
    `
      SELECT user_id, day_key, session_level, completed_sets, cardio_done, warmup_done, completed_at, updated_at
      FROM fit_progress WHERE user_id = ? AND day_key = ? LIMIT 1
    `,
    [userId, dayKey]
  );
  return rows[0] ?? null;
}

export async function saveFitProgress(
  userId: number,
  dayKey: string,
  sessionLevel: FitLevel,
  completedSets: string,
  cardioDone: boolean,
  warmupDone: boolean,
  completedAt: Date | null
): Promise<FitProgressRow | null> {
  await execute(
    `
      INSERT INTO fit_progress
        (user_id, day_key, session_level, completed_sets, cardio_done, warmup_done, completed_at, updated_at)
      VALUES (?, ?, ?, CAST(? AS JSON), ?, ?, ?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        session_level = COALESCE(session_level, VALUES(session_level)),
        completed_sets = VALUES(completed_sets),
        cardio_done = VALUES(cardio_done),
        warmup_done = VALUES(warmup_done),
        completed_at = IF(VALUES(completed_at) IS NULL, NULL, COALESCE(completed_at, VALUES(completed_at))),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [
      userId,
      dayKey,
      sessionLevel,
      completedSets,
      cardioDone ? 1 : 0,
      warmupDone ? 1 : 0,
      completedAt,
    ]
  );
  return findFitProgress(userId, dayKey);
}

export async function listFitContent(): Promise<FitContentRow[]> {
  return selectRows<FitContentRow>(
    `SELECT exercise_id, name, video_url, tips FROM fit_content ORDER BY exercise_id ASC`
  );
}

export async function upsertFitContent(
  exerciseId: string,
  name: string,
  videoUrl: string,
  tips: string
): Promise<void> {
  await execute(
    `
      INSERT INTO fit_content (exercise_id, name, video_url, tips)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), video_url = VALUES(video_url), tips = VALUES(tips)
    `,
    [exerciseId, name, videoUrl, tips]
  );
}

export async function purgeExpiredFitSessions(): Promise<void> {
  await execute(
    `DELETE FROM fit_sessions WHERE expires_at <= CURRENT_TIMESTAMP(3)`
  );
}

export async function countFitUsers(): Promise<number> {
  const rows = await selectRows<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM fit_users`
  );
  return Number(rows[0]?.total ?? 0);
}
