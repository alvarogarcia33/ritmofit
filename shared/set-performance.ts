/**
 * Optional measured results for an individual set. A mark can be recorded
 * before the set is ticked complete; that boolean is tracked separately.
 * kg (not lb) and actual repetitions are explicit to avoid unit ambiguity.
 */
export type SetPerformance = {
  setKey: string;
  weightKg: number | null;
  reps: number | null;
};

/** Reads previously persisted JSON, including pre-migration null columns. */
export function readSetPerformance(value: unknown): SetPerformance[] {
  if (typeof value === "string") {
    try {
      return readSetPerformance(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SetPerformance => {
    if (!item || typeof item !== "object") return false;
    const mark = item as Record<string, unknown>;
    const weight = mark.weightKg;
    const reps = mark.reps;
    return (
      typeof mark.setKey === "string" &&
      (weight === null || (typeof weight === "number" && Number.isFinite(weight))) &&
      (reps === null || (typeof reps === "number" && Number.isSafeInteger(reps)))
    );
  });
}

/** Restrict all keys to the current plan/day/level; reject fake values. */
export function validateSetPerformance(
  value: unknown,
  allowedKeys: readonly string[],
  timedExercises: ReadonlySet<string> = new Set()
): SetPerformance[] {
  if (!Array.isArray(value) || value.length > allowedKeys.length)
    throw new Error("Las marcas deben ser una lista de las series de este día.");
  const allowed = new Set(allowedKeys);
  const seen = new Set<string>();
  const byKey = new Map<string, SetPerformance>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Cada marca debe identificar una serie.");
    const item = raw as Record<string, unknown>;
    const setKey = item.setKey;
    if (typeof setKey !== "string" || !allowed.has(setKey) || seen.has(setKey))
      throw new Error("La marca no corresponde a una serie única de esta rutina.");
    seen.add(setKey);
    const weightKg = item.weightKg === undefined ? null : item.weightKg;
    const reps = item.reps === undefined ? null : item.reps;
    if (
      weightKg !== null &&
      (typeof weightKg !== "number" ||
        !Number.isFinite(weightKg) ||
        weightKg < 0 ||
        weightKg > 1000 ||
        Math.abs(Math.round(weightKg * 100) - weightKg * 100) > 0.000001)
    )
      throw new Error("El peso debe estar entre 0 y 1000 kg, con hasta dos decimales.");
    if (
      reps !== null &&
      (typeof reps !== "number" ||
        !Number.isSafeInteger(reps) ||
        reps < 1 ||
        reps > 200)
    )
      throw new Error("Las repeticiones deben ser un entero entre 1 y 200.");
    const exerciseId = setKey.slice(0, setKey.lastIndexOf(":"));
    if (timedExercises.has(exerciseId) && reps !== null)
      throw new Error("Los ejercicios cronometrados no usan repeticiones.");
    if (weightKg === null && reps === null) continue;
    byKey.set(setKey, {
      setKey,
      weightKg: weightKg as number | null,
      reps: reps as number | null,
    });
  }
  return allowedKeys.flatMap(key => {
    const mark = byKey.get(key);
    return mark ? [mark] : [];
  });
}

/** Ignore the day number when matching a personal exercise between versions. */
export function exerciseIdentity(exerciseId: string): string {
  const match = /^pp-d[1-7]-(.+)$/.exec(exerciseId);
  return match ? `pp-${match[1]}` : exerciseId;
}

export function setKeyExercise(setKey: string): string {
  return setKey.slice(0, setKey.lastIndexOf(":"));
}

export function formatSetMark(mark: SetPerformance): string {
  const pieces: string[] = [];
  if (mark.weightKg !== null) pieces.push(`${mark.weightKg} kg`);
  if (mark.reps !== null) pieces.push(`${mark.reps} reps`);
  return pieces.join(" · ");
}
