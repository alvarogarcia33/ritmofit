import type { Exercise, RoutineDay } from "./routine";
import type { TrainingPlan } from "./programs";

export const PERSONAL_PLAN_ID_PREFIX = "personal-";
export const PERSONAL_PLAN_ADMIN_FILTER_ID = "plan-personal-filter";
export const PERSONAL_PLAN_COVER = "/exercises/program-banner.png";
export const PERSONAL_PLAN_COLOR = "#238b83";
export const PERSONAL_PLAN_REST_SECONDS = 90;
export const PERSONAL_PLAN_WEEKS = 4;

export type ExerciseTargetUnit = "repeticiones" | "segundos";
export type ExerciseLibraryItem = {
  id: string;
  name: string;
  muscleGroupId: string;
  unit: ExerciseTargetUnit;
  defaultTarget: number;
  tips: string;
};
export type ExerciseMuscleGroup = {
  id: string;
  name: string;
  exercises: ExerciseLibraryItem[];
};
export type PersonalExerciseSelection = {
  exerciseId: string;
  sets: number;
  target: number;
};
export type PersonalDaySelection = {
  day: number;
  exercises: PersonalExerciseSelection[];
};
export type PersonalPlanDraft = { days: PersonalDaySelection[] };

const repsTip =
  "Usa una carga que puedas controlar con buena técnica. Mantén el movimiento fluido y detente si sientes dolor.";
const bodyweightTip =
  "Mantén una postura cómoda y estable. Ajusta el rango a tu movilidad y detente si sientes dolor.";

const exercise = (
  id: string,
  name: string,
  muscleGroupId: string,
  tips = repsTip,
  unit: ExerciseTargetUnit = "repeticiones",
  defaultTarget = unit === "segundos" ? 30 : 10
): ExerciseLibraryItem => ({
  id,
  name,
  muscleGroupId,
  unit,
  defaultTarget,
  tips,
});

export const EXERCISE_MUSCLE_GROUPS: ExerciseMuscleGroup[] = [
  {
    id: "pecho",
    name: "Pecho",
    exercises: [
      exercise("press-pecho-maquina", "Press de pecho en máquina", "pecho"),
      exercise(
        "flexiones-brazos",
        "Flexiones de brazos",
        "pecho",
        bodyweightTip
      ),
      exercise("press-plano-barra", "Press plano con barra", "pecho"),
      exercise("press-plano-mancuernas", "Press plano con mancuernas", "pecho"),
      exercise("press-inclinado-barra", "Press inclinado con barra", "pecho"),
      exercise(
        "press-inclinado-mancuernas",
        "Press inclinado con mancuernas",
        "pecho"
      ),
      exercise("aperturas-mancuernas", "Aperturas con mancuernas", "pecho"),
      exercise("cruce-poleas", "Cruce de poleas", "pecho"),
    ],
  },
  {
    id: "espalda",
    name: "Espalda",
    exercises: [
      exercise(
        "jalon-polea-agarre-v",
        "Jalón en polea alta con agarre V",
        "espalda",
        "Mantené el torso estable y llevá el agarre hacia la parte alta del pecho sin balancearte."
      ),
      exercise(
        "dominadas-asistidas",
        "Dominadas asistidas",
        "espalda",
        "Ajustá la asistencia para subir y bajar con control, sin impulsarte."
      ),
      exercise(
        "remo-maquina-pecho-apoyado",
        "Remo en máquina con pecho apoyado",
        "espalda"
      ),
      exercise("jalon-al-pecho", "Jalón al pecho", "espalda"),
      exercise("remo-barra", "Remo con barra", "espalda"),
      exercise("remo-mancuerna", "Remo con mancuerna", "espalda"),
      exercise("remo-polea-sentado", "Remo sentado en polea", "espalda"),
      exercise("pullover-polea", "Pullover con polea", "espalda"),
      exercise("face-pull", "Face pull", "espalda"),
    ],
  },
  {
    id: "hombros",
    name: "Hombros",
    exercises: [
      exercise("press-arnold", "Press Arnold con mancuernas", "hombros"),
      exercise(
        "elevaciones-laterales-polea",
        "Elevaciones laterales en polea",
        "hombros"
      ),
      exercise("press-militar", "Press militar", "hombros"),
      exercise("elevaciones-laterales", "Elevaciones laterales", "hombros"),
      exercise("elevaciones-frontales", "Elevaciones frontales", "hombros"),
      exercise("pajaros-hombro", "Pájaros para hombro posterior", "hombros"),
    ],
  },
  {
    id: "biceps",
    name: "Bíceps",
    exercises: [
      exercise(
        "curl-biceps-polea-baja",
        "Curl de bíceps en polea baja",
        "biceps"
      ),
      exercise(
        "curl-inclinado-mancuernas",
        "Curl inclinado con mancuernas",
        "biceps"
      ),
      exercise("curl-barra", "Curl de bíceps con barra", "biceps"),
      exercise("curl-alterno", "Curl alterno con mancuernas", "biceps"),
      exercise("curl-martillo", "Curl martillo", "biceps"),
      exercise("curl-concentrado", "Curl concentrado", "biceps"),
    ],
  },
  {
    id: "triceps",
    name: "Tríceps",
    exercises: [
      exercise(
        "press-banca-agarre-cerrado",
        "Press de banca con agarre cerrado",
        "triceps"
      ),
      exercise(
        "patada-triceps-mancuerna",
        "Patada de tríceps con mancuerna",
        "triceps"
      ),
      exercise("extension-polea", "Extensión de tríceps en polea", "triceps"),
      exercise(
        "extension-sobre-cabeza",
        "Extensión sobre la cabeza",
        "triceps"
      ),
      exercise("press-frances", "Press francés", "triceps"),
      exercise(
        "fondos-triceps",
        "Fondos para tríceps",
        "triceps",
        bodyweightTip
      ),
    ],
  },
  {
    id: "cuadriceps",
    name: "Cuádriceps",
    exercises: [
      exercise("sentadilla-hack", "Sentadilla hack en máquina", "cuadriceps"),
      exercise(
        "sentadilla-goblet",
        "Sentadilla goblet con mancuerna",
        "cuadriceps"
      ),
      exercise(
        "sentadilla-libre",
        "Sentadilla libre",
        "cuadriceps",
        bodyweightTip
      ),
      exercise("prensa-piernas", "Prensa de piernas", "cuadriceps"),
      exercise("extension-cuadriceps", "Extensión de cuádriceps", "cuadriceps"),
      exercise("zancadas", "Zancadas", "cuadriceps", bodyweightTip),
      exercise(
        "sentadilla-bulgara",
        "Sentadilla búlgara",
        "cuadriceps",
        bodyweightTip
      ),
    ],
  },
  {
    id: "femorales",
    name: "Femorales",
    exercises: [
      exercise(
        "curl-femoral-pie",
        "Curl femoral de pie en máquina",
        "femorales"
      ),
      exercise(
        "curl-femoral-fitball",
        "Curl femoral con pelota de estabilidad",
        "femorales",
        bodyweightTip
      ),
      exercise("peso-muerto-rumano", "Peso muerto rumano", "femorales"),
      exercise("curl-femoral-sentado", "Curl femoral sentado", "femorales"),
      exercise("curl-femoral-tumbado", "Curl femoral tumbado", "femorales"),
      exercise("buenos-dias", "Buenos días con barra", "femorales"),
    ],
  },
  {
    id: "gluteos",
    name: "Glúteos",
    exercises: [
      exercise(
        "pull-through-polea",
        "Pull-through en polea baja",
        "gluteos"
      ),
      exercise(
        "step-up-banco",
        "Subida al banco (step-up)",
        "gluteos",
        bodyweightTip
      ),
      exercise("hip-thrust", "Hip thrust", "gluteos"),
      exercise("puente-gluteos", "Puente de glúteos", "gluteos", bodyweightTip),
      exercise("patada-polea", "Patada de glúteo en polea", "gluteos"),
      exercise("extension-cadera", "Extensión de cadera en banco", "gluteos"),
    ],
  },
  {
    id: "aductores",
    name: "Aductores",
    exercises: [
      exercise(
        "aduccion-polea-baja",
        "Aducción de cadera en polea baja",
        "aductores"
      ),
      exercise(
        "aduccion-acostado",
        "Aducción de cadera acostado de lado",
        "aductores",
        bodyweightTip
      ),
      exercise("aductores-maquina", "Aductores en máquina", "aductores"),
    ],
  },
  {
    id: "abductores",
    name: "Abductores",
    exercises: [
      exercise(
        "clamshell-banda",
        "Apertura de cadera con banda (clamshell)",
        "abductores",
        bodyweightTip
      ),
      exercise(
        "elevacion-lateral-acostado",
        "Elevación lateral de pierna acostado",
        "abductores",
        bodyweightTip
      ),
      exercise("abductores-maquina", "Abductores en máquina", "abductores"),
      exercise("abduccion-polea", "Abducción de cadera en polea", "abductores"),
      exercise(
        "caminata-banda",
        "Caminata lateral con banda",
        "abductores",
        bodyweightTip
      ),
    ],
  },
  {
    id: "pantorrillas",
    name: "Pantorrillas",
    exercises: [
      exercise(
        "pantorrillas-una-pierna",
        "Elevación de pantorrillas a una pierna",
        "pantorrillas",
        bodyweightTip
      ),
      exercise(
        "pantorrillas-donkey",
        "Elevación de pantorrillas inclinado (donkey)",
        "pantorrillas"
      ),
      exercise(
        "pantorrillas-de-pie",
        "Elevación de pantorrillas de pie",
        "pantorrillas"
      ),
      exercise(
        "pantorrillas-sentado",
        "Elevación de pantorrillas sentado",
        "pantorrillas"
      ),
      exercise("pantorrillas-prensa", "Pantorrillas en prensa", "pantorrillas"),
    ],
  },
  {
    id: "core",
    name: "Abdomen y core",
    exercises: [
      exercise(
        "plancha-lateral",
        "Plancha lateral",
        "core",
        "Mantené el cuerpo alineado, sin hundir la cadera. Realizá el tiempo indicado por cada lado.",
        "segundos",
        30
      ),
      exercise(
        "crunch-polea-alta",
        "Crunch abdominal en polea alta",
        "core"
      ),
      exercise(
        "plancha-frontal",
        "Plancha frontal",
        "core",
        bodyweightTip,
        "segundos",
        30
      ),
      exercise("crunch-abdominal", "Crunch abdominal", "core", bodyweightTip),
      exercise(
        "bicicleta-abdominal",
        "Bicicleta abdominal",
        "core",
        bodyweightTip
      ),
      exercise(
        "elevacion-rodillas",
        "Elevación de rodillas",
        "core",
        bodyweightTip
      ),
      exercise("dead-bug", "Dead bug", "core", bodyweightTip),
    ],
  },
];

const EXERCISES_BY_ID = new Map(
  EXERCISE_MUSCLE_GROUPS.flatMap(group =>
    group.exercises.map(item => [item.id, item] as const)
  )
);
const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export class PersonalPlanInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalPlanInputError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(
  value: unknown,
  min: number,
  max: number
): value is number {
  return (
    Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

function normalizeDay(value: unknown, index: number): PersonalDaySelection {
  if (!isObject(value) || !positiveInteger(value.day, 1, 7))
    throw new PersonalPlanInputError(
      `El día ${index + 1} debe estar entre lunes y domingo.`
    );
  if (
    !Array.isArray(value.exercises) ||
    value.exercises.length < 1 ||
    value.exercises.length > 20
  )
    throw new PersonalPlanInputError(
      `${WEEKDAYS[Number(value.day) - 1]} necesita entre 1 y 20 ejercicios.`
    );

  const used = new Set<string>();
  const exercises = value.exercises.map(raw => {
    if (!isObject(raw) || typeof raw.exerciseId !== "string")
      throw new PersonalPlanInputError(
        "Selecciona ejercicios del catálogo disponible."
      );
    const entry = EXERCISES_BY_ID.get(raw.exerciseId);
    if (!entry)
      throw new PersonalPlanInputError(
        "Uno de los ejercicios no pertenece al catálogo."
      );
    if (used.has(entry.id))
      throw new PersonalPlanInputError(
        `${entry.name} ya está agregado a este día.`
      );
    used.add(entry.id);
    if (!positiveInteger(raw.sets, 1, 10))
      throw new PersonalPlanInputError(
        `${entry.name}: las series deben ser de 1 a 10.`
      );
    const maxTarget = entry.unit === "segundos" ? 3600 : 100;
    if (!positiveInteger(raw.target, 1, maxTarget))
      throw new PersonalPlanInputError(
        `${entry.name}: ${entry.unit} debe ser un entero entre 1 y ${maxTarget}.`
      );
    return { exerciseId: entry.id, sets: raw.sets, target: raw.target };
  });

  return {
    day: Number(value.day),
    exercises,
  };
}

export function buildPersonalPlan(
  planId: string,
  value: unknown
): TrainingPlan {
  if (
    !/^personal-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
      planId
    )
  )
    throw new PersonalPlanInputError("El ID privado del plan no es válido.");
  if (
    !isObject(value) ||
    !Array.isArray(value.days) ||
    value.days.length < 1 ||
    value.days.length > 7
  )
    throw new PersonalPlanInputError(
      "Agrega ejercicios a por lo menos un día de la semana."
    );
  const normalized = value.days.map(normalizeDay);
  if (new Set(normalized.map(day => day.day)).size !== normalized.length)
    throw new PersonalPlanInputError("No puedes repetir el mismo día.");
  normalized.sort((a, b) => a.day - b.day);
  const makeRoutine = (): RoutineDay[] =>
    normalized.map(day => {
      const items = day.exercises.map(
        selection => EXERCISES_BY_ID.get(selection.exerciseId)!
      );
      const exercises: Exercise[] = day.exercises.map(selection => {
        const item = EXERCISES_BY_ID.get(selection.exerciseId)!;
        return {
          id: `pp-d${day.day}-${item.id}`,
          name: item.name,
          videoUrl: "",
          thumbnail: "",
          block: 1,
          sets: selection.sets,
          reps: `${selection.target} ${item.unit}`,
          tips: item.tips,
          ...(item.unit === "segundos" ? { seconds: selection.target } : {}),
        };
      });
      const groups = [
        ...new Set(
          items.map(
            item =>
              EXERCISE_MUSCLE_GROUPS.find(
                group => group.id === item.muscleGroupId
              )?.name ?? "Fuerza"
          )
        ),
      ];
      return {
        day: day.day,
        label: WEEKDAYS[day.day - 1],
        focus:
          groups.length > 4 ? "Fuerza de cuerpo completo" : groups.join(" · "),
        subtitle: `${exercises.length} ${exercises.length === 1 ? "ejercicio elegido" : "ejercicios elegidos"} por ti. Ajusta la carga a tu nivel y mantén el control.`,
        page: 0,
        exercises,
      };
    });
  const first = makeRoutine();
  const second = first.map(day => ({
    ...day,
    exercises: day.exercises.map(item => ({ ...item })),
  }));
  return {
    id: planId,
    title: "Plan Personal",
    subtitle: "Tu selección. Tu ritmo.",
    description:
      "Una rutina armada por ti con ejercicios elegidos por grupo muscular.",
    color: PERSONAL_PLAN_COLOR,
    coverImage: PERSONAL_PLAN_COVER,
    weeks: PERSONAL_PLAN_WEEKS,
    mode: "straight",
    restSeconds: PERSONAL_PLAN_REST_SECONDS,
    published: true,
    sourceLabel: "TU SELECCIÓN",
    notes: [
      "Los ejercicios y sus cantidades fueron seleccionados por la persona titular de la cuenta; no reemplazan una evaluación profesional.",
      "No se asignan videos ni ilustraciones genéricas como demostraciones específicas. Revisa las indicaciones y usa una técnica segura.",
    ],
    routine: { first, second },
  };
}

export function personalPlanDraftFromPlan(
  plan: TrainingPlan
): PersonalPlanDraft {
  const days = plan.routine.first.map(day => ({
    day: day.day,
    exercises: day.exercises.map(item => {
      const match = /^pp-d\d+-(.+)$/.exec(item.id);
      const definition = match ? EXERCISES_BY_ID.get(match[1]) : undefined;
      if (!definition)
        throw new Error("No se pudo abrir la edición de este Plan Personal.");
      const parsedTarget =
        definition.unit === "segundos"
          ? (item.seconds ??
            Number(
              (item.reps ?? "").match(/^\d+/)?.[0] ?? definition.defaultTarget
            ))
          : Number(
              (item.reps ?? "").match(/^\d+/)?.[0] ?? definition.defaultTarget
            );
      return {
        exerciseId: definition.id,
        sets: item.sets ?? 3,
        target: parsedTarget,
      };
    }),
  }));
  return { days };
}

export function personalPlanAdminFilterOption(): TrainingPlan {
  return {
    id: PERSONAL_PLAN_ADMIN_FILTER_ID,
    title: "Plan Personal",
    subtitle: "Rutina privada de cada cuenta",
    description: "Opción de filtro; cada usuario tiene su propio plan.",
    color: PERSONAL_PLAN_COLOR,
    coverImage: PERSONAL_PLAN_COVER,
    weeks: PERSONAL_PLAN_WEEKS,
    mode: "straight",
    restSeconds: PERSONAL_PLAN_REST_SECONDS,
    published: true,
    sourceLabel: "FILTRO ADMINISTRATIVO",
    notes: [],
    routine: { first: [], second: [] },
    isPersonal: true,
  };
}
