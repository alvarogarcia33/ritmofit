import type { NextFunction, Request, Response, Router } from "express";
import {
  DEFAULT_PLANS,
  LEGACY_PLAN_ID,
  planConfig,
  planDay,
  requiredPlanSets,
  type PlanEnrollment,
  type TrainingPlan,
} from "../shared/programs";
import {
  LEVELS,
  type Exercise,
  type Level,
  type RoutineDay,
} from "../shared/routine";
import {
  findFitPlan,
  findFitPlanEnrollment,
  findFitPlanProgress,
  findFitActivePlan,
  hasAnyFitPlanProgress,
  insertFitPlan,
  listFitPlanEnrollments,
  listFitPlanProgress,
  listFitPlans,
  saveFitActivePlan,
  saveFitPlanEnrollment,
  saveFitPlanProgress,
  updateFitPlan,
  type FitPlanEnrollmentRow,
  type FitPlanProgressRow,
  type FitPlanRow,
} from "./fit-plan-db";
import {
  findFitProgress,
  findFitUserById,
  listFitProgress,
  saveFitProgress,
  updateFitUser,
  type FitLevel,
  type FitProgressRow,
  type FitUserRow,
} from "./fit-db";
import type { PublicFitProgress, PublicFitUser } from "./fit";

export class PlanValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "PlanValidationError";
  }
}

type JsonObject = Record<string, unknown>;
type Authenticated = { user: FitUserRow; tokenHash: string };

type FitPlanRouteDeps = {
  requireAuth: (req: Request) => Promise<Authenticated>;
  bodyOf: (req: Request) => JsonObject;
  fail: (status: number, message: string) => never;
  toPublicFitUser: (user: FitUserRow) => PublicFitUser;
  toPublicProgress: (
    row: FitProgressRow,
    fallbackLevel: FitLevel
  ) => PublicFitProgress;
  sanitizeProgress: (
    dayKey: string,
    level: FitLevel,
    value: unknown
  ) => {
    completedSets: string[];
    cardioDone: boolean;
    warmupDone: boolean;
    completedAt: Date | null;
  };
  hasPartialProgress: (row: FitProgressRow) => boolean;
};

const PLAN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const EXERCISE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const LEVEL_VALUES: Level[] = ["beginner", "intermediate", "advanced"];
const PLAN_TEXT_LIMITS = {
  title: [1, 120],
  subtitle: [0, 180],
  description: [0, 4000],
  sourceLabel: [0, 240],
  note: [0, 2000],
  dayLabel: [1, 80],
  dayFocus: [0, 180],
  daySubtitle: [0, 300],
  exerciseName: [1, 180],
  tips: [0, 4000],
  reps: [0, 120],
  altTitle: [0, 240],
  altCreator: [0, 180],
} as const;

function invalid(message: string): never {
  throw new PlanValidationError(message);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") invalid(`${field} debe ser texto`);
  if (value.length < min || value.length > max)
    invalid(`${field} debe tener entre ${min} y ${max} caracteres`);
  if (
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value) ||
    /[<>]/.test(value)
  ) {
    invalid(`${field} contiene caracteres no permitidos`);
  }
  return value;
}

function integer(
  value: unknown,
  field: string,
  min: number,
  max: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    invalid(`${field} debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}

function safeHttpsOrRelative(value: unknown, field: string): string {
  const candidate = text(value, field, 1, 4096);
  if (
    !candidate.startsWith("//") &&
    !candidate.includes("\\") &&
    !candidate.split(/[?#]/, 1)[0].split("/").includes("..") &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)
  ) {
    return candidate;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    invalid(`${field} debe ser una ruta relativa segura o una URL HTTPS`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname ||
    parsed.hostname.includes("@")
  ) {
    invalid(`${field} debe ser una ruta relativa segura o una URL HTTPS`);
  }
  return candidate;
}

function videoUrl(value: unknown, field: string, allowEmpty = true): string {
  const candidate = text(value, field, 0, 2048);
  if (candidate === "" && allowEmpty) return candidate;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    invalid(`${field} debe ser una URL HTTPS de YouTube o Vimeo`);
  }
  const host = parsed.hostname.toLowerCase();
  const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ]);
  const vimeoHosts = new Set([
    "vimeo.com",
    "www.vimeo.com",
    "player.vimeo.com",
  ]);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    (!youtubeHosts.has(host) && !vimeoHosts.has(host))
  ) {
    invalid(`${field} debe ser una URL HTTPS de YouTube o Vimeo`);
  }
  return candidate;
}

function planId(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !PLAN_ID_RE.test(value))
    invalid(`${field} debe usar un identificador ASCII estable`);
  return value;
}

function exerciseId(value: unknown, field: string): string {
  if (typeof value !== "string" || !EXERCISE_ID_RE.test(value))
    invalid(`${field} debe usar un identificador ASCII estable`);
  return value;
}

function level(value: unknown, field = "level"): Level {
  if (typeof value !== "string" || !LEVEL_VALUES.includes(value as Level))
    invalid(`${field} debe ser beginner, intermediate o advanced`);
  return value as Level;
}

function validateVideoAlternative(
  value: unknown,
  field: string
): NonNullable<Exercise["videoAlternative"]> {
  if (!isObject(value)) invalid(`${field} debe ser un objeto`);
  const provider = text(value.provider, `${field}.provider`, 1, 30);
  if (provider !== "YouTube") invalid(`${field}.provider no es compatible`);
  const result: NonNullable<Exercise["videoAlternative"]> = {
    watchUrl: videoUrl(value.watchUrl, `${field}.watchUrl`, false),
    provider: "YouTube",
    title: text(
      value.title,
      `${field}.title`,
      PLAN_TEXT_LIMITS.altTitle[0],
      PLAN_TEXT_LIMITS.altTitle[1]
    ),
    creator: text(
      value.creator,
      `${field}.creator`,
      PLAN_TEXT_LIMITS.altCreator[0],
      PLAN_TEXT_LIMITS.altCreator[1]
    ),
    sourceUrl: videoUrl(value.sourceUrl, `${field}.sourceUrl`, false),
  };
  if (value.embedUrl !== undefined) {
    result.embedUrl = videoUrl(value.embedUrl, `${field}.embedUrl`, false);
  }
  return result;
}

function validateExercise(
  value: unknown,
  field: string,
  mode: TrainingPlan["mode"]
): Exercise {
  if (!isObject(value)) invalid(`${field} debe ser un objeto`);
  const result: Exercise = {
    id: exerciseId(value.id, `${field}.id`),
    name: text(
      value.name,
      `${field}.name`,
      PLAN_TEXT_LIMITS.exerciseName[0],
      PLAN_TEXT_LIMITS.exerciseName[1]
    ),
    videoUrl: videoUrl(value.videoUrl, `${field}.videoUrl`),
    thumbnail: safeHttpsOrRelative(value.thumbnail, `${field}.thumbnail`),
    block: integer(value.block, `${field}.block`, 1, 9),
    tips: text(
      value.tips,
      `${field}.tips`,
      PLAN_TEXT_LIMITS.tips[0],
      PLAN_TEXT_LIMITS.tips[1]
    ),
  };
  if (value.sets !== undefined) {
    result.sets = integer(value.sets, `${field}.sets`, 1, 10);
  }
  if (value.reps !== undefined) {
    result.reps = text(
      value.reps,
      `${field}.reps`,
      PLAN_TEXT_LIMITS.reps[0],
      PLAN_TEXT_LIMITS.reps[1]
    );
  }
  if (value.seconds !== undefined) {
    result.seconds = integer(value.seconds, `${field}.seconds`, 1, 3600);
  }
  if (value.sourceImage !== undefined) {
    result.sourceImage = safeHttpsOrRelative(
      value.sourceImage,
      `${field}.sourceImage`
    );
  }
  if (value.videoAlternative !== undefined) {
    result.videoAlternative = validateVideoAlternative(
      value.videoAlternative,
      `${field}.videoAlternative`
    );
  }
  if (
    mode === "straight" &&
    result.sets !== undefined &&
    (result.sets < 1 || result.sets > 10)
  ) {
    invalid(`${field}.sets debe estar entre 1 y 10`);
  }
  return result;
}

function validateDay(
  value: unknown,
  field: string,
  mode: TrainingPlan["mode"],
  draft = false
): RoutineDay {
  if (!isObject(value)) invalid(`${field} debe ser un objeto`);
  const exercisesValue = value.exercises;
  if (!Array.isArray(exercisesValue) || (!draft && exercisesValue.length < 1))
    invalid(`${field}.exercises debe contener al menos un ejercicio`);
  const exercises = exercisesValue.map((item, index) =>
    validateExercise(item, `${field}.exercises[${index}]`, mode)
  );
  const ids = new Set<string>();
  for (const [index, exercise] of exercises.entries()) {
    if (ids.has(exercise.id))
      invalid(`${field}.exercises[${index}].id está repetido en el día`);
    ids.add(exercise.id);
  }
  const result: RoutineDay = {
    day: integer(value.day, `${field}.day`, 1, 6),
    label: text(
      value.label,
      `${field}.label`,
      PLAN_TEXT_LIMITS.dayLabel[0],
      PLAN_TEXT_LIMITS.dayLabel[1]
    ),
    focus: text(
      value.focus,
      `${field}.focus`,
      PLAN_TEXT_LIMITS.dayFocus[0],
      PLAN_TEXT_LIMITS.dayFocus[1]
    ),
    subtitle: text(
      value.subtitle,
      `${field}.subtitle`,
      PLAN_TEXT_LIMITS.daySubtitle[0],
      PLAN_TEXT_LIMITS.daySubtitle[1]
    ),
    page: integer(value.page, `${field}.page`, 0, 9999),
    exercises,
  };
  if (value.sourceImage !== undefined) {
    result.sourceImage = safeHttpsOrRelative(
      value.sourceImage,
      `${field}.sourceImage`
    );
  }
  return result;
}

function validateRoutine(
  value: unknown,
  field: string,
  mode: TrainingPlan["mode"],
  draft = false
): RoutineDay[] {
  if (!Array.isArray(value) || (!draft && value.length < 1) || value.length > 6)
    invalid(`${field} debe contener entre 1 y 6 días`);
  const days = value.map((item, index) =>
    validateDay(item, `${field}[${index}]`, mode, draft)
  );
  const dayNumbers = new Set<number>();
  for (const day of days) {
    if (dayNumbers.has(day.day)) invalid(`${field} no puede repetir un día`);
    dayNumbers.add(day.day);
  }
  return days;
}

/** Validates and normalizes an admin-supplied TrainingPlan without touching the database. */
export function validateTrainingPlan(value: unknown): TrainingPlan {
  if (!isObject(value)) invalid("El plan debe ser un objeto");
  const mode = value.mode;
  if (mode !== "supersets" && mode !== "straight")
    invalid("mode debe ser supersets o straight");
  const notesValue = value.notes;
  if (!Array.isArray(notesValue) || notesValue.length > 32)
    invalid("notes debe ser un arreglo de hasta 32 textos");
  const notes = notesValue.map((item, index) =>
    text(
      item,
      `notes[${index}]`,
      PLAN_TEXT_LIMITS.note[0],
      PLAN_TEXT_LIMITS.note[1]
    )
  );
  const sourceUrl =
    value.sourceUrl === undefined
      ? undefined
      : safeHttpsOrRelative(value.sourceUrl, "sourceUrl");
  if (typeof value.published !== "boolean")
    invalid("published debe ser booleano");
  const plan: TrainingPlan = {
    id: planId(value.id),
    title: text(
      value.title,
      "title",
      PLAN_TEXT_LIMITS.title[0],
      PLAN_TEXT_LIMITS.title[1]
    ),
    subtitle: text(
      value.subtitle,
      "subtitle",
      PLAN_TEXT_LIMITS.subtitle[0],
      PLAN_TEXT_LIMITS.subtitle[1]
    ),
    description: text(
      value.description,
      "description",
      PLAN_TEXT_LIMITS.description[0],
      PLAN_TEXT_LIMITS.description[1]
    ),
    color: text(value.color, "color", 7, 7),
    coverImage:
      !value.published && value.coverImage === ""
        ? ""
        : safeHttpsOrRelative(value.coverImage, "coverImage"),
    weeks: integer(value.weeks, "weeks", 1, 12),
    mode,
    restSeconds: integer(value.restSeconds, "restSeconds", 0, 7200),
    published: value.published,
    sourceLabel: text(
      value.sourceLabel,
      "sourceLabel",
      PLAN_TEXT_LIMITS.sourceLabel[0],
      PLAN_TEXT_LIMITS.sourceLabel[1]
    ),
    notes,
    routine: {
      first: validateRoutine(
        value.routine && isObject(value.routine)
          ? value.routine.first
          : undefined,
        "routine.first",
        mode,
        !value.published
      ),
      second: validateRoutine(
        value.routine && isObject(value.routine)
          ? value.routine.second
          : undefined,
        "routine.second",
        mode,
        !value.published
      ),
    },
  };
  if (!/^#[0-9A-Fa-f]{6}$/.test(plan.color))
    invalid("color debe ser un color hexadecimal de seis dígitos");
  if (sourceUrl !== undefined) plan.sourceUrl = sourceUrl;
  return plan;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

/** Structural fields that are unsafe to change once a plan has progress. */
export function planStructureSignature(plan: TrainingPlan): string {
  const section = (days: RoutineDay[]) =>
    days.map(day => ({
      day: day.day,
      exercises: day.exercises.map(exercise => ({
        id: exercise.id,
        block: exercise.block,
        sets:
          plan.mode === "straight"
            ? (exercise.sets ?? 3)
            : (exercise.sets ?? null),
        reps: exercise.reps ?? null,
        seconds: exercise.seconds ?? null,
      })),
    }));
  return json({
    weeks: plan.weeks,
    mode: plan.mode,
    first: section(plan.routine.first),
    second: section(plan.routine.second),
  });
}

function assertLegacyOriginal(plan: TrainingPlan): void {
  const original = DEFAULT_PLANS.find(item => item.id === LEGACY_PLAN_ID);
  if (!original) throw new Error("El plan legado no está disponible");
  const editable = new Set(["id", "title", "description", "color"]);
  const candidate = plan as unknown as JsonObject;
  const baseline = original as unknown as JsonObject;
  for (const key of Object.keys(baseline)) {
    if (editable.has(key)) continue;
    if (json(candidate[key]) !== json(baseline[key])) {
      invalid("Adelgazar conserva su rutina y dosificación originales");
    }
  }
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function dateValue(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    invalid("startDate debe tener formato YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    invalid("startDate no es válida");
  if (date.getUTCDay() !== 1) invalid("startDate debe ser un lunes");
  return value;
}

function mondayInTimezone(timezone: string): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  }
  const get = (type: string) =>
    Number(parts.find(part => part.type === type)?.value);
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 1 ? 0 : (8 - day) % 7));
  return date.toISOString().slice(0, 10);
}

function planIdParam(value: string, fail: FitPlanRouteDeps["fail"]): string {
  if (!PLAN_ID_RE.test(value)) fail(400, "El id del plan no es válido");
  return value;
}

function validationOrFail(
  value: unknown,
  deps: FitPlanRouteDeps
): TrainingPlan {
  try {
    return validateTrainingPlan(value);
  } catch (error) {
    if (error instanceof PlanValidationError)
      deps.fail(error.status, error.message);
    throw error;
  }
}

function parseStoredPlan(
  row: FitPlanRow,
  deps: FitPlanRouteDeps
): TrainingPlan {
  try {
    const payload =
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    return validateTrainingPlan(payload);
  } catch (error) {
    if (error instanceof PlanValidationError)
      deps.fail(500, "El catálogo contiene un plan inválido");
    throw error;
  }
}

async function getPlanOrFail(
  planIdValue: string,
  deps: FitPlanRouteDeps
): Promise<TrainingPlan> {
  const row = await findFitPlan(planIdValue);
  if (!row) deps.fail(404, "Plan no encontrado");
  return parseStoredPlan(row, deps);
}

function enrollmentFromRow(row: FitPlanEnrollmentRow): PlanEnrollment {
  return {
    planId: row.plan_id,
    startDate: dateOnly(row.start_date),
    level: row.level,
    restSeconds: Number(row.rest_seconds),
  };
}

function legacyEnrollment(
  user: FitUserRow,
  row?: FitPlanEnrollmentRow | null
): PlanEnrollment {
  return {
    planId: LEGACY_PLAN_ID,
    // The existing fit_users values remain canonical for the legacy plan. A
    // custom legacy rest timer, if it exists, is retained in the additive row.
    startDate: dateOnly(user.start_date),
    level: user.level,
    restSeconds: row
      ? Number(row.rest_seconds)
      : LEVELS[user.level].restSeconds,
  };
}

async function effectiveEnrollment(
  user: FitUserRow,
  planIdValue: string
): Promise<PlanEnrollment | null> {
  const row = await findFitPlanEnrollment(user.id, planIdValue);
  if (planIdValue === LEGACY_PLAN_ID) return legacyEnrollment(user, row);
  return row ? enrollmentFromRow(row) : null;
}

async function stateForUser(
  user: FitUserRow,
  deps: FitPlanRouteDeps
): Promise<{
  activePlanId: string;
  enrollments: PlanEnrollment[];
}> {
  const rows = await listFitPlanEnrollments(user.id);
  const byPlan = new Map<string, PlanEnrollment>();
  for (const row of rows) byPlan.set(row.plan_id, enrollmentFromRow(row));
  byPlan.set(
    LEGACY_PLAN_ID,
    legacyEnrollment(
      user,
      rows.find(row => row.plan_id === LEGACY_PLAN_ID)
    )
  );
  const active = await findFitActivePlan(user.id);
  const selected = active ? await findFitPlan(active.plan_id) : null;
  const selectedIsPublished = selected
    ? parseStoredPlan(selected, deps).published
    : false;
  return {
    activePlanId: selectedIsPublished ? active!.plan_id : LEGACY_PLAN_ID,
    enrollments: [...byPlan.values()].sort((a, b) =>
      a.planId.localeCompare(b.planId)
    ),
  };
}

function parseJsonStrings(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      return parseJsonStrings(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function partialPlanProgress(row: FitPlanProgressRow): boolean {
  return (
    row.completed_at === null &&
    (parseJsonStrings(row.completed_sets).length > 0 ||
      Boolean(row.cardio_done) ||
      Boolean(row.warmup_done))
  );
}

function toPublicPlanProgress(
  row: FitPlanProgressRow,
  fallbackLevel: FitLevel
): PublicFitProgress {
  return {
    dayKey: row.day_key,
    level: row.session_level ?? fallbackLevel,
    completedSets: [...new Set(parseJsonStrings(row.completed_sets))],
    cardioDone: Boolean(row.cardio_done),
    warmupDone: Boolean(row.warmup_done),
    completedAt: row.completed_at === null ? null : dateToIso(row.completed_at),
    updatedAt: dateToIso(row.updated_at),
  };
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const textValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(textValue))
    return `${textValue}T00:00:00.000Z`;
  const parsed = new Date(
    textValue.includes(" ") ? `${textValue.replace(" ", "T")}Z` : textValue
  );
  return Number.isNaN(parsed.getTime()) ? textValue : parsed.toISOString();
}

function parsePlanDayKey(
  dayKey: string,
  plan: TrainingPlan,
  fail: FitPlanRouteDeps["fail"]
): { week: number; day: number } {
  const match = /^w(\d{1,2})-d([1-6])$/.exec(dayKey);
  if (!match) fail(400, "dayKey no es válido para este plan");
  const week = Number(match[1]);
  const day = Number(match[2]);
  if (week < 1 || week > plan.weeks || !planDay(plan, week, day))
    fail(400, "El día no está programado en este plan");
  return { week, day };
}

function parseLegacyDayKey(
  dayKey: string,
  fail: FitPlanRouteDeps["fail"]
): void {
  if (!/^w[1-4]-d[1-6]$/.test(dayKey))
    fail(400, "dayKey debe estar entre w1-d1 y w4-d6");
}

function sanitizePlanProgress(
  plan: TrainingPlan,
  week: number,
  day: number,
  levelValue: FitLevel,
  value: unknown,
  fail: FitPlanRouteDeps["fail"]
): {
  completedSets: string[];
  requiredSets: string[];
  cardioDone: boolean;
  warmupDone: boolean;
  completedAt: Date | null;
} {
  if (!isObject(value)) fail(400, "El progreso debe ser un objeto");
  if (!Array.isArray(value.completedSets))
    fail(400, "completedSets debe ser un arreglo");
  if (
    typeof value.cardioDone !== "boolean" ||
    typeof value.warmupDone !== "boolean"
  ) {
    fail(400, "cardioDone y warmupDone deben ser booleanos");
  }
  const required = requiredPlanSets(plan, week, day, levelValue);
  const requiredSet = new Set(required);
  const incoming = new Set<string>();
  for (const item of value.completedSets) {
    if (typeof item !== "string" || !requiredSet.has(item)) {
      fail(400, "La clave de set no corresponde al plan, nivel o día actual");
    }
    incoming.add(item);
  }
  const completedSets = required.filter(item => incoming.has(item));
  const needsCardio =
    plan.mode === "supersets" && planConfig(plan, levelValue).cardioMinutes > 0;
  const complete =
    required.every(item => incoming.has(item)) &&
    (!needsCardio || value.cardioDone);
  return {
    completedSets,
    requiredSets: required,
    cardioDone: value.cardioDone,
    warmupDone: value.warmupDone,
    completedAt: complete ? new Date() : null,
  };
}

function route(handler: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function requireAdmin(auth: Authenticated, deps: FitPlanRouteDeps): void {
  if (auth.user.role !== "admin")
    deps.fail(403, "Se requiere rol de administrador");
}

function assertSafeRestSeconds(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 7200
  )
    invalid(`${field} debe ser un entero entre 0 y 7200`);
  return value;
}

export function registerFitPlanRoutes(
  router: Router,
  deps: FitPlanRouteDeps
): void {
  router.get(
    "/plans",
    route(async (req, res) => {
      await deps.requireAuth(req);
      const rows = await listFitPlans();
      const plans = rows
        .map(row => parseStoredPlan(row, deps))
        .filter(plan => plan.published);
      res.json({ plans });
    })
  );

  router.get(
    "/admin/plans",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      requireAdmin(auth, deps);
      const rows = await listFitPlans();
      res.json({ plans: rows.map(row => parseStoredPlan(row, deps)) });
    })
  );

  router.post(
    "/admin/plans",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      requireAdmin(auth, deps);
      const plan = validationOrFail(deps.bodyOf(req), deps);
      const existing = await findFitPlan(plan.id);
      if (existing) deps.fail(409, "Ya existe un plan con ese id");
      const inserted = await insertFitPlan(plan.id, plan);
      if (!inserted) deps.fail(500, "No se pudo guardar el plan");
      res.status(201).json({ plan: parseStoredPlan(inserted, deps) });
    })
  );

  router.put(
    "/admin/plans/:id",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      requireAdmin(auth, deps);
      const id = planIdParam(String(req.params.id), deps.fail);
      const plan = validationOrFail(deps.bodyOf(req), deps);
      if (plan.id !== id)
        deps.fail(400, "El id del cuerpo no coincide con la ruta");
      const existingRow = await findFitPlan(id);
      if (!existingRow) deps.fail(404, "Plan no encontrado");
      if (id === LEGACY_PLAN_ID) {
        try {
          assertLegacyOriginal(plan);
        } catch (error) {
          if (error instanceof PlanValidationError)
            deps.fail(error.status, error.message);
          throw error;
        }
      } else if (await hasAnyFitPlanProgress(id)) {
        const existingPlan = parseStoredPlan(existingRow, deps);
        if (existingPlan.published && !plan.published) {
          deps.fail(
            409,
            "No puedes ocultar un plan con historial de entrenamiento"
          );
        }
        if (
          planStructureSignature(existingPlan) !== planStructureSignature(plan)
        ) {
          deps.fail(
            409,
            "No puedes cambiar la estructura de un plan con progreso"
          );
        }
      }
      const updated = await updateFitPlan(id, plan);
      if (!updated) deps.fail(500, "No se pudo actualizar el plan");
      res.json({ plan: parseStoredPlan(updated, deps) });
    })
  );

  router.get(
    "/plan-state",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      res.json(await stateForUser(auth.user, deps));
    })
  );

  router.put(
    "/plans/:id/enrollment",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      const id = planIdParam(String(req.params.id), deps.fail);
      const plan = await getPlanOrFail(id, deps);
      const body = deps.bodyOf(req);
      if (plan.mode === "straight" && body.level !== undefined) {
        deps.fail(
          400,
          "Este plan no usa niveles; respeta las cantidades de cada ejercicio"
        );
      }
      const existingRow = await findFitPlanEnrollment(auth.user.id, id);
      if (id !== LEGACY_PLAN_ID && !plan.published && !existingRow) {
        deps.fail(404, "Plan no encontrado");
      }
      const current = await effectiveEnrollment(auth.user, id);
      const isFirstNewEnrollment = id !== LEGACY_PLAN_ID && !existingRow;

      let desiredStart =
        current?.startDate ?? mondayInTimezone(auth.user.timezone);
      let desiredLevel: Level = current?.level ?? auth.user.level;
      let desiredRest = current?.restSeconds ?? plan.restSeconds;
      try {
        if (body.startDate !== undefined)
          desiredStart = dateValue(body.startDate);
        if (body.level !== undefined) desiredLevel = level(body.level);
        if (body.restSeconds !== undefined)
          desiredRest = assertSafeRestSeconds(body.restSeconds, "restSeconds");
      } catch (error) {
        if (error instanceof PlanValidationError)
          deps.fail(error.status, error.message);
        throw error;
      }
      if (isFirstNewEnrollment && body.startDate === undefined) {
        desiredStart = mondayInTimezone(auth.user.timezone);
      }
      if (isFirstNewEnrollment && body.restSeconds === undefined) {
        desiredRest = plan.restSeconds;
      }

      const progressRows =
        id === LEGACY_PLAN_ID
          ? await listFitProgress(auth.user.id)
          : await listFitPlanProgress(auth.user.id, id);
      const previousStart = current?.startDate;
      const previousLevel = current?.level;
      if (
        previousStart &&
        desiredStart !== previousStart &&
        progressRows.length > 0
      ) {
        deps.fail(
          409,
          "No puedes cambiar la fecha porque ya existe progreso en este plan"
        );
      }
      if (previousLevel && desiredLevel !== previousLevel) {
        const partial =
          id === LEGACY_PLAN_ID
            ? (progressRows as FitProgressRow[]).some(deps.hasPartialProgress)
            : (progressRows as FitPlanProgressRow[]).some(partialPlanProgress);
        if (partial)
          deps.fail(
            409,
            "No puedes cambiar de nivel mientras tienes progreso parcial en este plan"
          );
      }

      let responseUser = auth.user;
      if (
        id === LEGACY_PLAN_ID &&
        (desiredLevel !== auth.user.level ||
          desiredStart !== dateOnly(auth.user.start_date))
      ) {
        const updated = await updateFitUser(auth.user.id, {
          level: desiredLevel,
          startDate: desiredStart,
        });
        if (!updated)
          deps.fail(500, "No se pudo sincronizar la matrícula de Adelgazar");
        responseUser = updated;
      }
      const saved = await saveFitPlanEnrollment({
        userId: auth.user.id,
        planId: id,
        startDate: desiredStart,
        level: desiredLevel,
        restSeconds: desiredRest,
      });
      if (!saved) deps.fail(500, "No se pudo guardar la matrícula");
      await saveFitActivePlan(auth.user.id, id);
      res.json({
        activePlanId: id,
        enrollments: (await stateForUser(responseUser, deps)).enrollments,
      });
    })
  );

  router.get(
    "/plans/:id/progress",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      const id = planIdParam(String(req.params.id), deps.fail);
      await getPlanOrFail(id, deps);
      if (id === LEGACY_PLAN_ID) {
        const enrollment = legacyEnrollment(auth.user);
        const progress = await listFitProgress(auth.user.id);
        res.json({
          progress: progress.map(row =>
            deps.toPublicProgress(row, enrollment.level)
          ),
        });
        return;
      }
      const enrollment = await effectiveEnrollment(auth.user, id);
      const progress = await listFitPlanProgress(auth.user.id, id);
      res.json({
        progress: progress.map(row =>
          toPublicPlanProgress(row, enrollment?.level ?? auth.user.level)
        ),
      });
    })
  );

  router.put(
    "/plans/:id/progress/:dayKey",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      const id = planIdParam(String(req.params.id), deps.fail);
      const dayKey = String(req.params.dayKey);
      const plan = await getPlanOrFail(id, deps);
      const body = deps.bodyOf(req);
      if (id === LEGACY_PLAN_ID) {
        parseLegacyDayKey(dayKey, deps.fail);
        const existing = await findFitProgress(auth.user.id, dayKey);
        const sessionLevel = existing?.session_level ?? auth.user.level;
        let sanitized;
        try {
          sanitized = deps.sanitizeProgress(dayKey, sessionLevel, body);
        } catch (error) {
          throw error;
        }
        const progress = await saveLegacyProgress(
          auth.user.id,
          dayKey,
          sessionLevel,
          sanitized.completedSets,
          sanitized.cardioDone,
          sanitized.warmupDone,
          sanitized.completedAt
        );
        if (!progress) deps.fail(500, "No se pudo guardar el progreso");
        res.json({ progress: deps.toPublicProgress(progress, sessionLevel) });
        return;
      }

      const parsed = parsePlanDayKey(dayKey, plan, deps.fail);
      const enrollment = await effectiveEnrollment(auth.user, id);
      if (!enrollment)
        deps.fail(
          409,
          "Debes inscribirte en este plan antes de guardar progreso"
        );
      const existing = await findFitPlanProgress(auth.user.id, id, dayKey);
      const sessionLevel = existing?.session_level ?? enrollment.level;
      const sanitized = sanitizePlanProgress(
        plan,
        parsed.week,
        parsed.day,
        sessionLevel,
        body,
        deps.fail
      );
      const progress = await saveFitPlanProgress({
        userId: auth.user.id,
        planId: id,
        dayKey,
        sessionLevel,
        requiredSets: JSON.stringify(sanitized.requiredSets),
        completedSets: JSON.stringify(sanitized.completedSets),
        cardioDone: sanitized.cardioDone,
        warmupDone: sanitized.warmupDone,
        completedAt: sanitized.completedAt,
      });
      if (!progress) deps.fail(500, "No se pudo guardar el progreso");
      res.json({ progress: toPublicPlanProgress(progress, sessionLevel) });
    })
  );

  router.get(
    "/admin/users/:id/plan/:planId",
    route(async (req, res) => {
      const auth = await deps.requireAuth(req);
      requireAdmin(auth, deps);
      const userId = Number(req.params.id);
      if (!Number.isSafeInteger(userId) || userId < 1)
        deps.fail(400, "El id de usuario no es válido");
      const planIdValue = planIdParam(String(req.params.planId), deps.fail);
      const user = await findFitUserById(userId);
      if (!user) deps.fail(404, "Usuario no encontrado");
      const plan = await getPlanOrFail(planIdValue, deps);
      const enrollment = await effectiveEnrollment(user, planIdValue);
      const progress =
        planIdValue === LEGACY_PLAN_ID
          ? (await listFitProgress(userId)).map(row =>
              deps.toPublicProgress(row, user.level)
            )
          : (await listFitPlanProgress(userId, planIdValue)).map(row =>
              toPublicPlanProgress(row, enrollment?.level ?? user.level)
            );
      res.json({
        user: deps.toPublicFitUser(user),
        progress,
        enrollment,
        plan,
      });
    })
  );
}

async function saveLegacyProgress(
  userId: number,
  dayKey: string,
  sessionLevel: FitLevel,
  completedSets: string[],
  cardioDone: boolean,
  warmupDone: boolean,
  completedAt: Date | null
): Promise<FitProgressRow | null> {
  return saveFitProgress(
    userId,
    dayKey,
    sessionLevel,
    JSON.stringify(completedSets),
    cardioDone,
    warmupDone,
    completedAt
  );
}

export function isPlanId(value: string): boolean {
  return PLAN_ID_RE.test(value);
}

export function validatePlanProgressInput(
  plan: TrainingPlan,
  week: number,
  day: number,
  levelValue: FitLevel,
  value: unknown
): { completedSets: string[]; requiredSets: string[]; completed: boolean } {
  const failure = (status: number, message: string): never => {
    throw new PlanValidationError(`${status}: ${message}`);
  };
  const sanitized = sanitizePlanProgress(
    plan,
    week,
    day,
    levelValue,
    value,
    failure
  );
  return {
    completedSets: sanitized.completedSets,
    requiredSets: sanitized.requiredSets,
    completed: sanitized.completedAt !== null,
  };
}
