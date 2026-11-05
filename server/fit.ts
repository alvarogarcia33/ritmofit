import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  findFitProgress,
  findFitUserById,
  findFitUserBySessionHash,
  findFitUserByUsername,
  initializeFitDatabase,
  deleteFitSession,
  insertFitSession,
  insertFitUser,
  listFitContent,
  listFitProgress,
  listFitUsers,
  purgeExpiredFitSessions,
  saveFitProgress,
  setFitLastLogin,
  type FitLevel,
  type FitProgressRow,
  type FitRole,
  type FitUserRow,
  updateFitPasswordAndRevokeOtherSessions,
  updateFitUser,
  upsertFitContent,
} from "./fit-db";
import express from "express";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const PASSWORD_N = 16_384;
const PASSWORD_R = 8;
const PASSWORD_P = 1;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const SESSION_COOKIE = "ritmo_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 10;

type JsonObject = Record<string, unknown>;
type RateKind = "login" | "register";
type Authenticated = { user: FitUserRow; tokenHash: string };

class FitHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "FitHttpError";
  }
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(status: number, message: string): never {
  throw new FitHttpError(status, message);
}

function requiredString(
  body: JsonObject,
  key: string,
  message: string
): string {
  const value = body[key];
  if (typeof value !== "string") fail(400, message);
  return value;
}

function optionalString(
  body: JsonObject,
  key: string,
  message: string
): string | undefined {
  if (!(key in body)) return undefined;
  const value = body[key];
  if (typeof value !== "string") fail(400, message);
  return value;
}

function assertEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    fail(400, "El correo electrónico no es válido");
  }
  return normalized;
}

function assertUsername(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_]{3,30}$/.test(normalized)) {
    fail(
      400,
      "El usuario debe tener entre 3 y 30 caracteres y solo usar letras, números o guion bajo"
    );
  }
  return normalized;
}

function assertPassword(value: string, field = "La contraseña"): string {
  if (value.length < 10 || value.length > 128) {
    fail(400, `${field} debe tener entre 10 y 128 caracteres`);
  }
  return value;
}

function assertFullName(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 2 || normalized.length > 80) {
    fail(400, "El nombre completo debe tener entre 2 y 80 caracteres");
  }
  return normalized;
}

function assertLevel(value: unknown, optional = false): FitLevel | undefined {
  if (value === undefined && optional) return undefined;
  if (
    value !== "beginner" &&
    value !== "intermediate" &&
    value !== "advanced"
  ) {
    fail(400, "El nivel debe ser beginner, intermediate o advanced");
  }
  return value;
}

function assertDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(400, "La fecha debe tener formato YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    fail(400, "La fecha no es válida");
  }
  return value;
}

function assertMondayDate(value: string): string {
  const normalized = assertDate(value);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDay() !== 1) {
    fail(400, "startDate debe ser un lunes para mantener el split semanal");
  }
  return normalized;
}

function nextMonday(): string {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const daysUntilMonday = currentDay === 1 ? 7 : (8 - currentDay) % 7;
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday
    )
  );
  return date.toISOString().slice(0, 10);
}

function assertTime(value: string): string {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    fail(400, "La hora debe tener formato HH:mm");
  return value;
}

function assertTimezone(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 64)
    fail(400, "La zona horaria no es válida");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format();
  } catch {
    fail(400, "La zona horaria no es válida");
  }
  return normalized;
}

function isDuplicateError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const parsed = new Date(
    text.includes(" ") ? `${text.replace(" ", "T")}Z` : text
  );
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function nullableDateToIso(value: unknown): string | null {
  return value === null || value === undefined ? null : dateToIso(value);
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeToHm(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  return String(value).slice(0, 5);
}

export interface PublicFitUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: FitRole;
  level: FitLevel;
  startDate: string;
  reminderTime: string;
  remindersEnabled: boolean;
  timezone: string;
  createdAt: string;
  lastLogin: string | null;
}

export function toPublicFitUser(user: FitUserRow): PublicFitUser {
  return {
    id: Number(user.id),
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    level: user.level,
    startDate: dateOnly(user.start_date),
    reminderTime: timeToHm(user.reminder_time),
    remindersEnabled: Boolean(user.reminders_enabled),
    timezone: user.timezone,
    createdAt: dateToIso(user.created_at),
    lastLogin: nullableDateToIso(user.last_login),
  };
}

export interface PublicFitProgress {
  dayKey: string;
  level: FitLevel;
  completedSets: string[];
  cardioDone: boolean;
  warmupDone: boolean;
  completedAt: string | null;
  updatedAt: string;
}

function parseCompletedSets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      return parseCompletedSets(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function toPublicProgress(
  row: FitProgressRow,
  fallbackLevel: FitLevel
): PublicFitProgress {
  return {
    dayKey: row.day_key,
    level: row.session_level ?? fallbackLevel,
    completedSets: [...new Set(parseCompletedSets(row.completed_sets))],
    cardioDone: Boolean(row.cardio_done),
    warmupDone: Boolean(row.warmup_done),
    completedAt: nullableDateToIso(row.completed_at),
    updatedAt: dateToIso(row.updated_at),
  };
}

export async function hashFitPassword(password: string): Promise<string> {
  const salt = randomBytes(PASSWORD_SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_N,
    r: PASSWORD_R,
    p: PASSWORD_P,
    maxmem: 32 * 1024 * 1024,
  });
  return [
    "scrypt",
    PASSWORD_N,
    PASSWORD_R,
    PASSWORD_P,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyFitPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  try {
    const [algorithm, nText, rText, pText, saltText, keyText] =
      encoded.split("$");
    if (algorithm !== "scrypt" || !saltText || !keyText) return false;
    const n = Number(nText);
    const r = Number(rText);
    const p = Number(pText);
    if (
      ![n, r, p].every(Number.isSafeInteger) ||
      n < 2 ||
      r < 1 ||
      p < 1 ||
      n > 1_048_576
    )
      return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (salt.length < 8 || expected.length === 0 || expected.length > 128)
      return false;
    const actual = await scryptAsync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 32 * 1024 * 1024,
    });
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

function sha256Token(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function parseCookieHeader(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const rawValue = part.slice(index + 1).trim();
    try {
      cookies.set(key, decodeURIComponent(rawValue));
    } catch {
      cookies.set(key, rawValue);
    }
  }
  return cookies;
}

function requestToken(req: Request): string | null {
  const authorization = req.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
    if (match && match[1].length >= 20 && match[1].length <= 200)
      return match[1];
  }
  return parseCookieHeader(req.headers.cookie).get(SESSION_COOKIE) ?? null;
}

async function authenticate(req: Request): Promise<Authenticated | null> {
  const token = requestToken(req);
  if (!token) return null;
  const tokenHash = sha256Token(token);
  const user = await findFitUserBySessionHash(tokenHash);
  return user ? { user, tokenHash } : null;
}

async function requireAuth(req: Request): Promise<Authenticated> {
  const auth = await authenticate(req);
  if (!auth) fail(401, "Debes iniciar sesión");
  return auth;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await insertFitSession(sha256Token(token), userId, expiresAt);
  return token;
}

function sendSession(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function enforceRateLimit(req: Request, kind: RateKind): void {
  const key = `${kind}:${clientIp(req)}`;
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw Object.assign(
      new FitHttpError(429, "Demasiados intentos; inténtalo más tarde"),
      { retryAfter }
    );
  }
}

function clearRateLimit(req: Request, kind: RateKind): void {
  rateBuckets.delete(`${kind}:${clientIp(req)}`);
}

function withNoStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
}

function requireRitmoHeader(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.get("X-Ritmo-Request") !== "1") {
    next(new FitHttpError(403, "Falta el encabezado X-Ritmo-Request"));
    return;
  }
  next();
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

function bodyOf(req: Request): JsonObject {
  if (!isObject(req.body)) fail(400, "El cuerpo JSON es obligatorio");
  return req.body;
}

function dayParts(dayKey: string): { week: number; day: number } {
  const match = /^w([1-4])-d([1-6])$/.exec(dayKey);
  if (!match) fail(400, "dayKey debe estar entre w1-d1 y w4-d6");
  return { week: Number(match[1]), day: Number(match[2]) };
}

function pageForDay(dayKey: string): number {
  const { week, day } = dayParts(dayKey);
  return (week <= 2 ? 21 : 27) + day;
}

function levelParameters(level: FitLevel): { rounds: number; blocks: number } {
  if (level === "beginner") return { rounds: 5, blocks: 4 };
  if (level === "intermediate") return { rounds: 4, blocks: 7 };
  return { rounds: 3, blocks: 9 };
}

function exerciseIdFor(page: number, exercise: number): string {
  return `p${page}-e${exercise}`;
}

function setSort(a: string, b: string): number {
  const [aExercise, aRound] = a
    .slice(a.indexOf("-e") + 2)
    .split(":")
    .map(Number);
  const [bExercise, bRound] = b
    .slice(b.indexOf("-e") + 2)
    .split(":")
    .map(Number);
  return aExercise - bExercise || aRound - bRound;
}

function sanitizeProgress(
  dayKey: string,
  level: FitLevel,
  value: unknown
): {
  completedSets: string[];
  cardioDone: boolean;
  warmupDone: boolean;
  completedAt: Date | null;
} {
  const body = isObject(value)
    ? value
    : fail(400, "El progreso debe ser un objeto");
  if (!Array.isArray(body.completedSets))
    fail(400, "completedSets debe ser un arreglo");
  if (
    typeof body.cardioDone !== "boolean" ||
    typeof body.warmupDone !== "boolean"
  ) {
    fail(400, "cardioDone y warmupDone deben ser booleanos");
  }

  const page = pageForDay(dayKey);
  const { rounds, blocks } = levelParameters(level);
  const unique = [...new Set(body.completedSets)];
  const accepted: string[] = [];
  for (const item of unique) {
    if (typeof item !== "string") fail(400, "Cada set debe ser texto");
    const match = /^p(\d+)-e(\d+):(\d+)$/.exec(item);
    if (!match) fail(400, "La clave de set no es válida");
    const itemPage = Number(match[1]);
    const exercise = Number(match[2]);
    const round = Number(match[3]);
    if (
      itemPage !== page ||
      exercise < 1 ||
      exercise > blocks ||
      round < 1 ||
      round > rounds ||
      item !== `${exerciseIdFor(page, exercise)}:${round}`
    ) {
      fail(400, "La clave de set no corresponde al nivel o día actual");
    }
    accepted.push(item);
  }
  accepted.sort(setSort);

  const required = new Set<string>();
  for (let exercise = 1; exercise <= blocks; exercise += 1) {
    for (let round = 1; round <= rounds; round += 1) {
      required.add(`${exerciseIdFor(page, exercise)}:${round}`);
    }
  }
  const complete =
    body.cardioDone && [...required].every(item => accepted.includes(item));
  return {
    completedSets: accepted,
    cardioDone: body.cardioDone,
    warmupDone: body.warmupDone,
    completedAt: complete ? new Date() : null,
  };
}

function hasPartialProgress(row: FitProgressRow): boolean {
  return (
    row.completed_at === null &&
    (parseCompletedSets(row.completed_sets).length > 0 ||
      Boolean(row.cardio_done) ||
      Boolean(row.warmup_done))
  );
}

function assertVimeoUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail(400, "videoUrl debe ser una URL HTTPS de Vimeo");
  }
  const validPath =
    parsed.hostname === "player.vimeo.com"
      ? /^\/video\/\d+\/?$/.test(parsed.pathname)
      : /^\/\d+(?:\/[a-zA-Z0-9]+)?\/?$/.test(parsed.pathname);
  if (
    parsed.protocol !== "https:" ||
    !["vimeo.com", "player.vimeo.com"].includes(
      parsed.hostname.toLowerCase()
    ) ||
    parsed.username ||
    parsed.password ||
    value.length > 2048 ||
    !validPath
  ) {
    fail(
      400,
      "Usa un enlace HTTPS de Vimeo con un identificador de video válido"
    );
  }
  return parsed.toString();
}

function validExerciseId(value: string): boolean {
  return /^p(?:2[2-9]|3[0-3])-e[1-9]$/.test(value);
}

async function getContentResponse(): Promise<
  Array<{ exerciseId: string; name: string; videoUrl: string; tips: string }>
> {
  const rows = await listFitContent();
  return rows.map(row => ({
    exerciseId: row.exercise_id,
    name: row.name,
    videoUrl: row.video_url,
    tips: row.tips,
  }));
}

export async function registerFitRoutes(app: Express): Promise<void> {
  await initializeFitDatabase();
  await purgeExpiredFitSessions();

  const router = express.Router();
  router.use(withNoStore);
  router.use((req, _res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      requireRitmoHeader(req, _res, next);
      return;
    }
    next();
  });

  router.get(
    "/me",
    asyncRoute(async (req, res) => {
      const auth = await authenticate(req);
      res.json({ user: auth ? toPublicFitUser(auth.user) : null });
    })
  );

  router.post(
    "/register",
    asyncRoute(async (req, res) => {
      enforceRateLimit(req, "register");
      const body = bodyOf(req);
      const username = assertUsername(
        requiredString(body, "username", "El usuario es obligatorio")
      );
      const password = assertPassword(
        requiredString(body, "password", "La contraseña es obligatoria")
      );
      const fullName = assertFullName(
        requiredString(body, "fullName", "El nombre completo es obligatorio")
      );
      const email = assertEmail(
        requiredString(body, "email", "El correo electrónico es obligatorio")
      );
      const level = assertLevel(body.level, true) ?? "beginner";
      const startDate = assertMondayDate(
        body.startDate === undefined
          ? nextMonday()
          : requiredString(body, "startDate", "startDate debe ser texto")
      );
      const timezone = assertTimezone(
        requiredString(body, "timezone", "La zona horaria es obligatoria")
      );
      const passwordHash = await hashFitPassword(password);

      let userId: number;
      try {
        userId = await insertFitUser({
          username,
          passwordHash,
          fullName,
          email,
          level,
          startDate,
          timezone,
        });
      } catch (error) {
        if (isDuplicateError(error))
          fail(409, "El usuario o correo ya está registrado");
        throw error;
      }
      const user = await findFitUserById(userId);
      if (!user) fail(500, "No se pudo crear la cuenta");
      const token = await createSession(userId);
      clearRateLimit(req, "register");
      sendSession(res, token);
      res.status(201).json({ user: toPublicFitUser(user), token });
    })
  );

  router.post(
    "/login",
    asyncRoute(async (req, res) => {
      enforceRateLimit(req, "login");
      const body = bodyOf(req);
      const username = assertUsername(
        requiredString(body, "username", "El usuario es obligatorio")
      );
      const password = requiredString(
        body,
        "password",
        "La contraseña es obligatoria"
      );
      if (password.length < 1 || password.length > 128)
        fail(401, "Credenciales inválidas");
      const user = await findFitUserByUsername(username);
      if (!user || !(await verifyFitPassword(password, user.password_hash))) {
        fail(401, "Credenciales inválidas");
      }
      await setFitLastLogin(user.id);
      const updatedUser = await findFitUserById(user.id);
      if (!updatedUser) fail(401, "Credenciales inválidas");
      const token = await createSession(user.id);
      clearRateLimit(req, "login");
      sendSession(res, token);
      res.json({ user: toPublicFitUser(updatedUser), token });
    })
  );

  router.post(
    "/logout",
    asyncRoute(async (req, res) => {
      const token = requestToken(req);
      if (token) {
        await deleteFitSession(sha256Token(token));
      }
      clearSessionCookie(res);
      res.json({ success: true });
    })
  );

  router.put(
    "/profile",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      const body = bodyOf(req);
      const updates: {
        fullName?: string;
        email?: string;
        level?: FitLevel;
        startDate?: string;
        reminderTime?: string;
        remindersEnabled?: boolean;
        timezone?: string;
      } = {};

      if ("fullName" in body)
        updates.fullName = assertFullName(
          optionalString(body, "fullName", "fullName debe ser texto") ?? ""
        );
      if ("email" in body)
        updates.email = assertEmail(
          optionalString(body, "email", "email debe ser texto") ?? ""
        );
      if ("level" in body) updates.level = assertLevel(body.level) as FitLevel;
      if ("startDate" in body)
        updates.startDate = assertMondayDate(
          optionalString(body, "startDate", "startDate debe ser texto") ?? ""
        );
      if ("reminderTime" in body)
        updates.reminderTime = assertTime(
          optionalString(body, "reminderTime", "reminderTime debe ser texto") ??
            ""
        );
      if ("remindersEnabled" in body) {
        if (typeof body.remindersEnabled !== "boolean")
          fail(400, "remindersEnabled debe ser booleano");
        updates.remindersEnabled = body.remindersEnabled;
      }
      if ("timezone" in body)
        updates.timezone = assertTimezone(
          optionalString(body, "timezone", "timezone debe ser texto") ?? ""
        );
      if (Object.keys(updates).length === 0)
        fail(400, "No hay cambios de perfil");

      let existingProgress: FitProgressRow[] | null = null;
      if (updates.level !== undefined && updates.level !== auth.user.level) {
        existingProgress = await listFitProgress(auth.user.id);
        if (existingProgress.some(hasPartialProgress)) {
          fail(
            409,
            "No puedes cambiar de nivel mientras tienes progreso parcial"
          );
        }
      }
      if (
        updates.startDate !== undefined &&
        updates.startDate !== dateOnly(auth.user.start_date)
      ) {
        existingProgress ??= await listFitProgress(auth.user.id);
        if (existingProgress.length > 0) {
          fail(
            409,
            "No puedes cambiar startDate porque ya existen registros de progreso"
          );
        }
      }

      let updated: FitUserRow | null;
      try {
        updated = await updateFitUser(auth.user.id, updates);
      } catch (error) {
        if (isDuplicateError(error)) fail(409, "El correo ya está registrado");
        throw error;
      }
      if (!updated) fail(500, "No se pudo actualizar el perfil");
      res.json({ user: toPublicFitUser(updated) });
    })
  );

  router.post(
    "/password",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      const body = bodyOf(req);
      const currentPassword = requiredString(
        body,
        "currentPassword",
        "La contraseña actual es obligatoria"
      );
      const newPassword = assertPassword(
        requiredString(
          body,
          "newPassword",
          "La nueva contraseña es obligatoria"
        ),
        "La nueva contraseña"
      );
      if (
        !(await verifyFitPassword(currentPassword, auth.user.password_hash))
      ) {
        fail(401, "La contraseña actual es incorrecta");
      }
      const passwordHash = await hashFitPassword(newPassword);
      await updateFitPasswordAndRevokeOtherSessions(
        auth.user.id,
        passwordHash,
        auth.tokenHash
      );
      res.json({ success: true });
    })
  );

  router.get(
    "/progress",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      const progress = await listFitProgress(auth.user.id);
      res.json({
        progress: progress.map(row => toPublicProgress(row, auth.user.level)),
      });
    })
  );

  router.put(
    "/progress/:dayKey",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      const dayKey = String(req.params.dayKey);
      dayParts(dayKey);
      const body = bodyOf(req);
      const existing = await findFitProgress(auth.user.id, dayKey);
      const sessionLevel = existing?.session_level ?? auth.user.level;
      const sanitized = sanitizeProgress(dayKey, sessionLevel, body);
      const progress = await saveFitProgress(
        auth.user.id,
        dayKey,
        sessionLevel,
        JSON.stringify(sanitized.completedSets),
        sanitized.cardioDone,
        sanitized.warmupDone,
        sanitized.completedAt
      );
      if (!progress) fail(500, "No se pudo guardar el progreso");
      res.json({
        progress: toPublicProgress(progress, sessionLevel),
      });
    })
  );

  router.get(
    "/content",
    asyncRoute(async (_req, res) => {
      res.json({ overrides: await getContentResponse() });
    })
  );

  router.put(
    "/admin/content/:exerciseId",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      if (auth.user.role !== "admin")
        fail(403, "Se requiere rol de administrador");
      const exerciseId = String(req.params.exerciseId);
      if (!validExerciseId(exerciseId))
        fail(400, "exerciseId no pertenece al dataset de Ritmo Fit");
      const body = bodyOf(req);
      const name = requiredString(body, "name", "name es obligatorio").trim();
      const videoUrl = assertVimeoUrl(
        requiredString(body, "videoUrl", "videoUrl es obligatorio").trim()
      );
      const tips = requiredString(body, "tips", "tips es obligatorio");
      if (name.length < 2 || name.length > 140)
        fail(400, "name debe tener entre 2 y 140 caracteres");
      if (tips.length > 2000)
        fail(400, "tips no puede superar 2000 caracteres");
      await upsertFitContent(exerciseId, name, videoUrl, tips);
      res.json({ success: true });
    })
  );

  router.get(
    "/admin/users",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      if (auth.user.role !== "admin")
        fail(403, "Se requiere rol de administrador");
      const users = await listFitUsers();
      res.json({ users: users.map(toPublicFitUser) });
    })
  );

  router.get(
    "/admin/users/:id",
    asyncRoute(async (req, res) => {
      const auth = await requireAuth(req);
      if (auth.user.role !== "admin")
        fail(403, "Se requiere rol de administrador");
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1)
        fail(400, "El id de usuario no es válido");
      const user = await findFitUserById(id);
      if (!user) fail(404, "Usuario no encontrado");
      const progress = await listFitProgress(id);
      res.json({
        user: toPublicFitUser(user),
        progress: progress.map(row => toPublicProgress(row, user.level)),
      });
    })
  );

  router.use((_req, _res, next) =>
    next(new FitHttpError(404, "Ruta Fit no encontrada"))
  );
  router.use(
    (error: unknown, req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) return;
      const fitError =
        error instanceof FitHttpError
          ? error
          : new FitHttpError(500, "Error interno del servidor");
      const retryAfter =
        error && typeof error === "object" && "retryAfter" in error
          ? Number((error as { retryAfter?: unknown }).retryAfter)
          : undefined;
      if (retryAfter && Number.isFinite(retryAfter))
        res.setHeader("Retry-After", String(retryAfter));
      if (fitError.status >= 500) {
        console.error("[Ritmo Fit]", error);
      }
      res.status(fitError.status).json({ error: fitError.message });
    }
  );

  app.use("/api/fit", router);
}
