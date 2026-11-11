import {
  LEVELS,
  ROUTINE,
  type Exercise,
  type Level,
  type RoutineDay,
} from "./routine";

export const LEGACY_PLAN_ID = "adelgazar";

export type TrainingPlan = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  coverImage: string;
  weeks: number;
  mode: "supersets" | "straight";
  restSeconds: number;
  published: boolean;
  sourceLabel: string;
  sourceUrl?: string;
  notes: string[];
  routine: { first: RoutineDay[]; second: RoutineDay[] };
};

export type PlanEnrollment = {
  planId: string;
  startDate: string;
  level: Level;
  restSeconds: number;
};

const toneSource = (day: number) => `/plans/tonificar/day-${day}.webp`;
const toneVideo = (videoId: string, url: string) => ({ videoId, url });
function toneExercise(
  day: number,
  index: number,
  name: string,
  reps: string,
  tips: string,
  options: { seconds?: number; video?: ReturnType<typeof toneVideo> } = {}
): Exercise {
  return {
    id: `tone-d${day}-e${index}`,
    name,
    videoUrl: options.video?.url ?? "",
    thumbnail: options.video
      ? `https://i.ytimg.com/vi/${options.video.videoId}/hqdefault.jpg`
      : `/plans/tonificar/d${day}-e${index}.webp`,
    sourceImage: toneSource(day),
    block: 1,
    sets: 3,
    reps,
    ...(options.seconds ? { seconds: options.seconds } : {}),
    tips,
  };
}
const TONE_DAYS: RoutineDay[] = [
  {
    day: 1,
    label: "Lunes",
    focus: "Glúteos y femorales",
    subtitle:
      "Seis ejercicios de la lámina original. Controla el movimiento y la carga.",
    page: 0,
    sourceImage: toneSource(1),
    exercises: [
      toneExercise(
        1,
        1,
        "Hip thrust",
        "10 repeticiones",
        "La lámina indica subir el peso en cada serie. Ajusta la carga con un profesional; no comprometas la técnica.",
        {
          video: toneVideo(
            "zaSzxo6xleY",
            "https://www.youtube.com/shorts/zaSzxo6xleY?feature=share"
          ),
        }
      ),
      toneExercise(
        1,
        2,
        "Búlgaras",
        "10 repeticiones por pierna",
        "Con un peso sostenible, según la lámina. Completa ambas piernas antes de marcar la serie.",
        {
          video: toneVideo(
            "cytfxsIK_Hk",
            "https://www.youtube.com/shorts/cytfxsIK_Hk"
          ),
        }
      ),
      toneExercise(
        1,
        3,
        "Peso muerto",
        "10 repeticiones",
        "La fuente indica subir el peso en cada serie. Mantén una técnica controlada y una carga adecuada para ti.",
        {
          video: toneVideo(
            "QjP9g7M_Idg",
            "https://www.youtube.com/shorts/QjP9g7M_Idg"
          ),
        }
      ),
      toneExercise(
        1,
        4,
        "Patada en polea a 45°",
        "15 repeticiones por pierna",
        "La fuente indica subir el peso en cada serie. Completa ambas piernas y evita compensar con la espalda.",
        {
          video: toneVideo(
            "-YgMavu-_XQ",
            "https://www.youtube.com/shorts/-YgMavu-_XQ"
          ),
        }
      ),
      toneExercise(
        1,
        5,
        "Femorales",
        "10 pesadas + 10 bajando el peso a la mitad",
        "La lámina indica 10 repeticiones pesadas más 10 con la mitad de peso. Confirma la carga y esta técnica de reducción con tu profesional.",
        {
          video: toneVideo(
            "nmqG-tIr0hc",
            "https://www.youtube.com/shorts/nmqG-tIr0hc"
          ),
        }
      ),
      toneExercise(
        1,
        6,
        "Plancha frontal",
        "45 segundos",
        "Mantén la posición controlada por 45 segundos. Tres series; detente ante dolor o pérdida de postura.",
        {
          seconds: 45,
          video: toneVideo(
            "XCOq6lfsFAk",
            "https://www.youtube.com/shorts/XCOq6lfsFAk"
          ),
        }
      ),
    ],
  },
  {
    day: 2,
    label: "Martes",
    focus: "Espalda y bíceps",
    subtitle:
      "Cinco ejercicios. Completa tres series por ejercicio con un peso sostenible.",
    page: 0,
    sourceImage: toneSource(2),
    exercises: [
      toneExercise(
        2,
        1,
        "Jalón de polea",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "-MS6Z88wv5I",
            "https://www.youtube.com/shorts/-MS6Z88wv5I"
          ),
        }
      ),
      toneExercise(
        2,
        2,
        "Remo con mancuerna",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina. Controla el tronco durante el remo.",
        {
          video: toneVideo(
            "-RngKKzbEnI",
            "https://www.youtube.com/shorts/-RngKKzbEnI"
          ),
        }
      ),
      toneExercise(
        2,
        3,
        "Pull over con cuerda",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "kXLRGQLISG4",
            "https://www.youtube.com/shorts/kXLRGQLISG4"
          ),
        }
      ),
      toneExercise(
        2,
        4,
        "Vuelos laterales",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina. Evita impulsarte para levantar la carga.",
        {
          video: toneVideo(
            "w8Knw73_Tw8",
            "https://www.youtube.com/shorts/w8Knw73_Tw8"
          ),
        }
      ),
      toneExercise(
        2,
        5,
        "Martillo (bíceps)",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "Oat8Gwahvw4",
            "https://www.youtube.com/shorts/Oat8Gwahvw4"
          ),
        }
      ),
    ],
  },
  {
    day: 3,
    label: "Miércoles",
    focus: "Cuádriceps y pantorrillas",
    subtitle:
      "Seis ejercicios con cantidades específicas y una plancha de 45 segundos.",
    page: 0,
    sourceImage: toneSource(3),
    exercises: [
      toneExercise(
        3,
        1,
        "Prensa de piernas",
        "10 repeticiones",
        "La lámina indica subir el peso en cada serie; usa una carga que puedas controlar.",
        {
          video: toneVideo(
            "WAjen1w8kWM",
            "https://www.youtube.com/shorts/WAjen1w8kWM"
          ),
        }
      ),
      toneExercise(
        3,
        2,
        "Sentadillas libres",
        "10 repeticiones",
        "La lámina indica subir el peso en cada serie. No sacrifiques el control de la postura.",
        {
          video: toneVideo(
            "4Gzv-EjUclo",
            "https://www.youtube.com/shorts/4Gzv-EjUclo"
          ),
        }
      ),
      toneExercise(
        3,
        3,
        "Zancadas",
        "10 repeticiones por pierna",
        "En la lámina figura «Sancadas». Con un peso sostenible. Completa ambas piernas antes de marcar la serie.",
        {
          video: toneVideo(
            "OOoMo14FPmM",
            "https://www.youtube.com/shorts/OOoMo14FPmM"
          ),
        }
      ),
      toneExercise(
        3,
        4,
        "Sillón de cuádriceps",
        "10 repeticiones + 1 repetición al fallo",
        "Se transcribe la indicación de la lámina. El trabajo al fallo requiere supervisión y no debe continuar ante dolor ni pérdida de técnica.",
        {
          video: toneVideo(
            "S50jrJDzO4M",
            "https://www.youtube.com/shorts/S50jrJDzO4M"
          ),
        }
      ),
      toneExercise(
        3,
        5,
        "Plancha frontal",
        "45 segundos",
        "Tres series de 45 segundos, como indica la lámina. Mantén una posición que puedas controlar.",
        {
          seconds: 45,
          video: toneVideo(
            "_Plb5jSSlX4",
            "https://www.youtube.com/shorts/_Plb5jSSlX4"
          ),
        }
      ),
      toneExercise(
        3,
        6,
        "Elevación de pantorrillas",
        "15 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "H3Iii8hPzlc",
            "https://www.youtube.com/shorts/H3Iii8hPzlc"
          ),
        }
      ),
    ],
  },
  {
    day: 4,
    label: "Jueves",
    focus: "Hombro, pecho y tríceps",
    subtitle: "Cinco ejercicios con tres series de diez repeticiones.",
    page: 0,
    sourceImage: toneSource(4),
    exercises: [
      toneExercise(
        4,
        1,
        "Press militar",
        "10 repeticiones",
        "Con un peso sostenible. La ilustración muestra la variante sentada con barra.",
        {
          video: toneVideo(
            "gY2Wp2PXF8w",
            "https://www.youtube.com/shorts/gY2Wp2PXF8w"
          ),
        }
      ),
      toneExercise(
        4,
        2,
        "Vuelos frontales",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "zuID1WDdAFE",
            "https://www.youtube.com/shorts/zuID1WDdAFE"
          ),
        }
      ),
      toneExercise(
        4,
        3,
        "Apertura de pecho",
        "10 repeticiones",
        "Con un peso sostenible. La ilustración muestra la variante en máquina.",
        {
          video: toneVideo(
            "-PNgCrCPcPM",
            "https://www.youtube.com/shorts/-PNgCrCPcPM"
          ),
        }
      ),
      toneExercise(
        4,
        4,
        "Vuelos laterales",
        "10 repeticiones",
        "Con un peso sostenible, según la lámina.",
        {
          video: toneVideo(
            "w8Knw73_Tw8",
            "https://www.youtube.com/shorts/w8Knw73_Tw8"
          ),
        }
      ),
      toneExercise(
        4,
        5,
        "Extensión de tríceps",
        "10 repeticiones",
        "Con un peso sostenible. La ilustración muestra la extensión en polea.",
        {
          video: toneVideo(
            "4NWWB0f0vzQ",
            "https://www.youtube.com/shorts/4NWWB0f0vzQ"
          ),
        }
      ),
    ],
  },
  {
    day: 5,
    label: "Viernes",
    focus: "Pierna completa",
    subtitle:
      "Seis ejercicios para cerrar la semana. No hay sesión en las láminas para sábado o domingo.",
    page: 0,
    sourceImage: toneSource(5),
    exercises: [
      toneExercise(
        5,
        1,
        "Sentadillas libres",
        "10 repeticiones",
        "La lámina indica subir el peso en cada serie; adapta la carga a tu técnica."
      ),
      toneExercise(
        5,
        2,
        "Peso muerto",
        "10 repeticiones",
        "La lámina indica subir el peso en cada serie. Mantén el movimiento controlado."
      ),
      toneExercise(
        5,
        3,
        "Hip thrust",
        "15 repeticiones",
        "La lámina indica subir el peso en cada serie. Esta sesión tiene 15 repeticiones, no las 10 del lunes."
      ),
      toneExercise(
        5,
        4,
        "Aductores",
        "15 repeticiones",
        "Con un peso sostenible. Se conserva el nombre indicado en la lámina; confirma el ajuste de la máquina con tu profesional."
      ),
      toneExercise(
        5,
        5,
        "Abductores",
        "15 repeticiones",
        "Con un peso sostenible. Se conserva el nombre indicado en la lámina."
      ),
      toneExercise(
        5,
        6,
        "Pantorrillas de pie",
        "15 repeticiones",
        "Con un peso sostenible, según la lámina."
      ),
    ],
  },
];

export const DEFAULT_PLANS: TrainingPlan[] = [
  {
    id: LEGACY_PLAN_ID,
    title: "Adelgazar",
    subtitle: "Fuerza + movimiento",
    description:
      "Tu programa original de Pérdida de Peso: super series, tres niveles y cardio. El historial que ya construiste sigue aquí.",
    color: "#e9387a",
    coverImage:
      "/manus-storage/async-images/zP49ZzlgK0C48Q1zStaQj1/image-1.webp",
    weeks: 4,
    mode: "supersets",
    restSeconds: 120,
    published: true,
    sourceLabel: "PDF Pérdida de Peso",
    sourceUrl: "/programa-perdida-de-peso.pdf",
    notes: [],
    routine: ROUTINE,
  },
  {
    id: "tonificar",
    title: "Tonificar",
    subtitle: "Fuerza + control",
    description:
      "Las cinco láminas que compartiste, organizadas para seguir cada serie, descansar y construir constancia. De lunes a viernes, con las cantidades de cada imagen.",
    color: "#7c4ed4",
    coverImage:
      "/manus-storage/async-images/VwMfzeRAmktLUa0hud9r3g/image-1.webp",
    weeks: 4,
    mode: "straight",
    restSeconds: 90,
    published: true,
    sourceLabel: "Cinco láminas aportadas",
    notes: [
      "Las láminas indican una semana de lunes a viernes. Las cuatro semanas de seguimiento repiten esa estructura como organización de la app; la fuente no prescribe la duración del ciclo.",
      "Las imágenes no indican descansos. El reloj parte en 90 segundos como opción configurable de la app, no como instrucción de la fuente. No se añade cardio obligatorio ni niveles.",
      "Las indicaciones de carga progresiva, reducción de peso y trabajo al fallo se transcriben del material. Confirma su aplicación con tu profesional y detente ante dolor o pérdida de técnica.",
    ],
    routine: { first: TONE_DAYS, second: TONE_DAYS },
  },
];

export function replacePlanExerciseMediaFromDefault(
  storedPlan: TrainingPlan,
  defaultPlan: TrainingPlan,
  dayNumber: number
): { plan: TrainingPlan; updatedExerciseIds: string[] } {
  const sourceDay = defaultPlan.routine.first.find(
    day => day.day === dayNumber
  );
  if (!sourceDay) return { plan: storedPlan, updatedExerciseIds: [] };
  const sourceById = new Map(
    sourceDay.exercises.map(exercise => [exercise.id, exercise])
  );
  const updated = new Set<string>();
  const replace = (days: RoutineDay[]) =>
    days.map(day =>
      day.day === dayNumber
        ? {
            ...day,
            exercises: day.exercises.map(exercise => {
              const source = sourceById.get(exercise.id);
              if (!source) return exercise;
              updated.add(exercise.id);
              const next = {
                ...exercise,
                videoUrl: source.videoUrl,
                thumbnail: source.thumbnail,
              };
              if (source.videoAlternative)
                next.videoAlternative = source.videoAlternative;
              else delete next.videoAlternative;
              return next;
            }),
          }
        : day
    );
  return {
    plan: {
      ...storedPlan,
      routine: {
        first: replace(storedPlan.routine.first),
        second: replace(storedPlan.routine.second),
      },
    },
    updatedExerciseIds: [...updated],
  };
}

export function planDays(plan: TrainingPlan, week: number): RoutineDay[] {
  return plan.routine[week <= 2 ? "first" : "second"];
}
export function planDay(plan: TrainingPlan, week: number, day: number) {
  return planDays(plan, week).find(d => d.day === day);
}
export function planConfig(plan: TrainingPlan, level: Level) {
  if (plan.mode === "supersets") return LEVELS[level];
  return {
    label: "Series por ejercicio",
    rounds: 3,
    reps: "Según ejercicio",
    restSeconds: plan.restSeconds,
    cardioMinutes: 0,
    blocks: 1,
  };
}
export function exerciseSets(
  plan: TrainingPlan,
  exercise: Exercise,
  level: Level
): number {
  return plan.mode === "supersets"
    ? LEVELS[level].rounds
    : (exercise.sets ?? 3);
}
export function plannedExercises(
  plan: TrainingPlan,
  week: number,
  day: number,
  level: Level
): Exercise[] {
  const exercises = planDay(plan, week, day)?.exercises ?? [];
  return plan.mode === "supersets"
    ? exercises.filter(e => e.block <= LEVELS[level].blocks)
    : exercises;
}
export function requiredPlanSets(
  plan: TrainingPlan,
  week: number,
  day: number,
  level: Level
): string[] {
  return plannedExercises(plan, week, day, level).flatMap(e =>
    Array.from(
      { length: exerciseSets(plan, e, level) },
      (_, i) => `${e.id}:${i + 1}`
    )
  );
}
export function planTotalSessions(plan: TrainingPlan): number {
  return Array.from(
    { length: plan.weeks },
    (_, i) => planDays(plan, i + 1).length
  ).reduce((a, b) => a + b, 0);
}
