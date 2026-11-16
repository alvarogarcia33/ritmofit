import type { TrainingPlan } from "./programs";
import type { Exercise, RoutineDay } from "./routine";

/**
 * Fase inicial del programa Fuerza Integral 5D.
 *
 * Programa propio para principiantes: no muta el programa de fuerza principal
 * ni su historial. Sus seis semanas se organizan en dos etapas utilizando
 * la estructura que RitmoFit ya admite (weeks 1–2 / weeks 3–6).
 */
type AdaptationMovement = readonly [
  name: string,
  laterSets: number,
  laterReps: string,
  pattern: string,
  rest: string,
  technique: string,
  firstReps?: string,
];

type AdaptationDay = {
  label: string;
  focus: string;
  movements: readonly AdaptationMovement[];
};

const ADAPTATION_WEEK: readonly AdaptationDay[] = [
  {
    label: "Lunes",
    focus: "Superior A · técnica de empuje y tracción",
    movements: [
      ["Press de pecho en máquina", 3, "10", "Empuje horizontal", "90–120 s", "Escápulas estables y recorrido cómodo"],
      ["Remo sentado en polea", 3, "10", "Tracción horizontal", "90–120 s", "Sin balancear el torso"],
      ["Jalón al pecho con agarre V", 2, "10", "Tracción vertical", "90–120 s", "Bajá los codos, no la cabeza"],
      ["Press de hombros en máquina", 2, "10", "Empuje vertical", "90–120 s", "No hiperextiendas la espalda"],
      ["Pallof press", 2, "10 por lado", "Estabilidad / core", "60–90 s", "Mantené el tronco quieto", "10 por lado"],
    ],
  },
  {
    label: "Martes",
    focus: "Inferior A · rodilla y bisagra",
    movements: [
      ["Prensa de piernas", 3, "10", "Dominancia de rodilla", "90–120 s", "No despegar la pelvis del respaldo"],
      ["Peso muerto rumano con mancuernas", 3, "10", "Bisagra de cadera", "90–120 s", "Cadera atrás, espalda neutra"],
      ["Curl femoral en máquina", 2, "10", "Femorales", "60–90 s", "No rebotes ni arquees la espalda"],
      ["Elevación de gemelos de pie", 2, "12", "Pantorrillas", "60–90 s", "Recorrido completo y controlado"],
      ["Dead bug", 2, "10 por lado", "Estabilidad / core", "60 s", "Espalda estable contra el suelo", "10 por lado"],
    ],
  },
  {
    label: "Miércoles",
    focus: "Superior B · control escapular y brazos",
    movements: [
      ["Press inclinado con mancuernas", 3, "10", "Empuje inclinado", "90–120 s", "Usá un recorrido controlado"],
      ["Remo con pecho apoyado", 3, "10", "Tracción horizontal", "90–120 s", "Mantener el pecho apoyado"],
      ["Jalón al pecho agarre neutro", 2, "10", "Tracción vertical", "90–120 s", "No balancear el cuerpo"],
      ["Elevación lateral de hombros", 2, "12", "Deltoides medio", "60–90 s", "Sin impulso ni encogimiento de hombros"],
      ["Curl de bíceps en polea", 2, "10", "Flexión de codo", "60–90 s", "Codos estables"],
    ],
  },
  {
    label: "Jueves",
    focus: "Inferior B · glúteos y trabajo unilateral",
    movements: [
      ["Sentadilla goblet", 3, "10", "Sentadilla", "90–120 s", "Priorizá control y profundidad cómoda"],
      ["Hip thrust", 3, "10", "Extensión de cadera", "90–120 s", "Pausa arriba sin hiperextender lumbar"],
      ["Zancada estática con apoyo", 2, "10 por pierna", "Unilateral", "90 s", "Usá un apoyo si perdés equilibrio", "10 por pierna"],
      ["Extensión de cuádriceps en máquina", 2, "10", "Cuádriceps", "60–90 s", "Sin bloquear bruscamente las rodillas"],
      ["Elevación de gemelos sentado", 2, "12", "Pantorrillas", "60–90 s", "Movimiento controlado"],
    ],
  },
  {
    label: "Viernes",
    focus: "Superior C · repetición técnica y estabilidad",
    movements: [
      ["Press con mancuernas agarre neutro", 3, "10", "Empuje horizontal", "90–120 s", "No forzar profundidad en hombros"],
      ["Remo en máquina", 3, "10", "Tracción horizontal", "90–120 s", "Evitá tirar con la zona lumbar"],
      ["Jalón al pecho agarre V", 2, "10", "Tracción vertical", "90–120 s", "Controlá la fase de regreso"],
      ["Face pull con cuerda", 2, "12", "Deltoides posterior", "60–90 s", "Llevá la cuerda hacia la cara"],
      ["Extensión de tríceps en polea", 2, "10", "Extensión de codo", "60–90 s", "Evitar movimiento del tronco"],
    ],
  },
];

function adaptationExercise(
  day: number,
  index: number,
  movement: AdaptationMovement,
  initial: boolean,
): Exercise {
  const [name, laterSets, laterReps, pattern, rest, technique, firstReps] = movement;
  const reps = initial ? (firstReps ?? "12") : laterReps;
  return {
    id: `f5a-d${day}-e${index + 1}`,
    name,
    block: 1,
    sets: initial ? 2 : laterSets,
    reps: `${reps} repeticiones`,
    videoUrl: "",
    thumbnail: "/ritmo-mark.svg",
    tips: `${technique}. ${pattern}. Descanso: ${rest}. ` +
      (initial
        ? "Semanas 1–2: elegí una carga que deje unas 3 repeticiones en reserva; no llegues al fallo."
        : "Semanas 3–6: dejá 2–3 repeticiones en reserva; subí de carga solo con técnica estable."),
  };
}

function buildAdaptationDays(initial: boolean): RoutineDay[] {
  return ADAPTATION_WEEK.map((day, index) => ({
    day: index + 1,
    label: day.label,
    focus: day.focus,
    subtitle: initial
      ? "Inicio: 2 series por ejercicio. Técnica, control y adaptación, sin fallo."
      : "Consolidación: 2–3 series por ejercicio, progresión gradual sin fallo.",
    page: 0,
    exercises: day.movements.map((movement, movementIndex) =>
      adaptationExercise(index + 1, movementIndex, movement, initial)),
  }));
}

export const ADAPTATION_5D_PLAN: TrainingPlan = {
  id: "fuerza-integral-5d-adaptacion",
  title: "Fuerza Integral 5D — Adaptación",
  subtitle: "Fase 1 · adaptación a la fuerza",
  description:
    "Etapa inicial de seis semanas para quien comienza gimnasio. Cinco días de pesas de lunes a viernes, " +
    "con técnica y recuperación prioritarias. Primeras dos semanas: 50 series totales distribuidas. " +
    "Semanas 3–6: 60 series semanales. Al finalizar, continuá con Fuerza Integral 5D si dominás los movimientos.",
  color: "#178B80",
  coverImage: "/plans/fuerza-integral-5d-adaptacion.svg",
  weeks: 6,
  mode: "straight",
  restSeconds: 90,
  published: true,
  sourceLabel: "Fuerza Integral 5D · Fase inicial",
  notes: [
    "La adaptación forma parte del recorrido Fuerza Integral 5D. Completá esta fase antes de elegir el plan principal de ocho semanas.",
    "Cinco días de pesas: superior A, inferior A, superior B, inferior B y superior C. El cardio es opcional y adicional.",
    "Antes de entrenar: movilidad de 5–10 minutos y 1–3 series progresivas de aproximación del primer ejercicio principal. No cuentan como series efectivas.",
    "Semanas 1–2: 2 series por ejercicio, normalmente 12 repeticiones. Dejá alrededor de 3 repeticiones en reserva (RIR 3).",
    "Semanas 3–4: en los básicos, 3 series de 10; los accesorios quedan en 2 series. Dejá 2–3 repeticiones en reserva.",
    "Semanas 5–6: mantené las series, priorizá hacer más fácil la técnica y aumentá la carga gradualmente solo si las repeticiones salen controladas. No entrenes al fallo.",
    "No se prescriben kilos. Si aparece dolor articular o la técnica se deteriora, interrumpí ese ejercicio y revisá la ejecución.",
    "Antes de avanzar a la fase de fuerza: completá los movimientos con control, sin dolor y recuperándote entre sesiones; si no, repetí o alargá esta etapa.",
  ],
  routine: { first: buildAdaptationDays(true), second: buildAdaptationDays(false) },
};
