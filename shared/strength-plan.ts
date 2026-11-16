import type { TrainingPlan } from "./programs";
import type { Exercise, RoutineDay } from "./routine";

/**
 * Programa independiente de fuerza de 8 semanas.
 * Transcripción del Excel «Rutina_Fuerza_5_Dias_Alvaro_2026.xlsx».
 * Los valores de series y repeticiones son objetivos; no se prescriben kilos.
 * Se mantiene la misma estructura semanal para las ocho semanas.
 */
type StrengthExercise = readonly [
  name: string,
  sets: number,
  reps: string,
  rest: string,
  movement: string,
  alternative: string,
  technique: string,
];

function toExercise(day: number, index: number, entry: StrengthExercise): Exercise {
  const [name, sets, reps, rest, movement, alternative, technique] = entry;
  return {
    id: `f5d-d${day}-e${index + 1}`,
    name,
    videoUrl: "",
    thumbnail: "/ritmo-mark.svg",
    block: 1,
    sets,
    reps: reps.includes("/lado")
      ? `${reps.split("/")[0]} repeticiones por lado`
      : `${reps} repeticiones`,
    tips: `${technique} Descanso: ${rest}. Patrón: ${movement}. Alternativa: ${alternative}.`,
  };
}

function strengthDay(
  day: number,
  label: string,
  focus: string,
  subtitle: string,
  rows: readonly StrengthExercise[]
): RoutineDay {
  return {
    day,
    label,
    focus,
    subtitle,
    page: 0,
    exercises: rows.map((row, index) => toExercise(day, index, row)),
  };
}

export const STRENGTH_5D_DAYS: RoutineDay[] = [
  strengthDay(1, "Lunes", "Tren superior A — fuerza horizontal",
    "Press horizontal y tracción. Duración orientativa: 65–80 min.", [
      ["Press de banca con barra", 4, "5", "3–4 min", "Empuje horizontal", "Press en máquina convergente", "Primero. Recorrido controlado; evitar fallo técnico"],
      ["Remo con pecho apoyado", 3, "6", "2–3 min", "Tracción horizontal", "Remo en polea sentado", "Sin balanceo de torso"],
      ["Press militar con mancuernas", 3, "6", "2–3 min", "Empuje vertical", "Press de hombros en máquina", "Abdomen firme, sin arquear espalda"],
      ["Jalón al pecho con agarre V", 3, "8", "2 min", "Tracción vertical", "Dominadas asistidas", "Llevar codos hacia abajo; no balancearse"],
      ["Elevación lateral de hombros", 2, "12", "60–90 s", "Deltoides medio", "Elevación lateral en polea", "Controlar descenso"],
      ["Pallof press", 2, "10/lado", "60–90 s", "Antirrotación / core", "Dead bug", "Evitar girar el tronco"],
    ]),
  strengthDay(2, "Martes", "Tren inferior A — dominancia de rodilla",
    "Sentadilla y soporte posterior. Duración orientativa: 70–85 min.", [
      ["Sentadilla con barra", 4, "5", "3–4 min", "Rodilla / cuádriceps", "Sentadilla en multipower", "Profundidad que controles sin dolor"],
      ["Peso muerto rumano", 3, "6", "2–3 min", "Bisagra / femorales", "RDL con mancuernas", "Espalda neutra; carga cerca del cuerpo"],
      ["Prensa de piernas", 3, "8", "2 min", "Cuádriceps / glúteos", "Sentadilla hack", "No despegar la pelvis del respaldo"],
      ["Curl femoral en máquina", 3, "10", "90–120 s", "Flexión de rodilla", "Curl femoral sentado", "Evitar rebotes"],
      ["Elevación de gemelos de pie", 3, "12", "60–90 s", "Pantorrilla", "Gemelos en prensa", "Pausa breve en estiramiento"],
      ["Crunch abdominal en polea", 2, "12", "60–90 s", "Flexión de tronco", "Crunch en colchoneta", "Mover el torso, no solo los brazos"],
    ]),
  strengthDay(3, "Miércoles", "Tren superior B — tracción vertical",
    "Tracción vertical y press inclinado. Duración orientativa: 65–80 min.", [
      ["Dominadas asistidas o jalón prono", 3, "6", "3 min", "Tracción vertical", "Jalón al pecho en polea", "Elegir variante que permita técnica constante"],
      ["Press inclinado con mancuernas", 3, "8", "2–3 min", "Empuje inclinado", "Press inclinado en máquina", "Sin perder el control de escápulas"],
      ["Remo sentado en polea", 3, "8", "2 min", "Tracción horizontal", "Remo en máquina", "No llevar torso hacia atrás"],
      ["Press de hombros en máquina", 2, "8", "2 min", "Empuje vertical", "Press sentado mancuernas", "Mantener rango sin dolor"],
      ["Curl de bíceps con barra EZ", 2, "10", "60–90 s", "Flexión de codo", "Curl de bíceps en polea", "Codos estables"],
      ["Extensión de tríceps en polea", 2, "10", "60–90 s", "Extensión de codo", "Extensión unilateral", "Sin despegar codos del cuerpo"],
      ["Pec deck inverso", 2, "12", "60–90 s", "Deltoides posterior", "Pájaros con mancuernas", "Abrir sin elevar hombros"],
    ]),
  strengthDay(4, "Jueves", "Tren inferior B — cadena posterior",
    "Bisagra de cadera y trabajo unilateral. Duración orientativa: 70–90 min.", [
      ["Peso muerto con barra hexagonal", 3, "5", "3–4 min", "Bisagra / fuerza total", "Peso muerto convencional técnico", "No buscar fallo; prioridad absoluta a postura"],
      ["Sentadilla búlgara", 3, "8/lado", "2 min", "Unilateral / cuádriceps", "Zancada estática", "Controlar equilibrio antes de subir carga"],
      ["Hip thrust", 3, "8", "2 min", "Extensión de cadera", "Puente de glúteos", "Pausa arriba sin hiperextensión lumbar"],
      ["Extensión de cuádriceps", 3, "10", "90–120 s", "Cuádriceps", "Step-up bajo", "Movimiento fluido y estable"],
      ["Curl femoral sentado", 3, "10", "90–120 s", "Femorales", "Curl femoral tumbado", "Pausa al flexionar"],
      ["Gemelos sentado", 3, "12", "60–90 s", "Sóleo / pantorrilla", "Gemelos de pie", "Recorrido completo"],
    ]),
  strengthDay(5, "Viernes", "Tren superior C — consolidación",
    "Fuerza y equilibrio del tren superior. Duración orientativa: 65–80 min.", [
      ["Press con mancuernas, agarre neutro", 3, "6", "2–3 min", "Empuje horizontal", "Press en máquina pecho", "Movimiento fuerte sin fallo técnico"],
      ["Remo unilateral con mancuerna", 3, "8/lado", "2 min", "Tracción horizontal", "Remo unilateral en polea", "Evitar rotar el torso"],
      ["Jalón al pecho agarre amplio", 2, "8", "2 min", "Tracción vertical", "Jalón neutro", "Controlar recorrido"],
      ["Face pull con cuerda", 2, "12", "60–90 s", "Deltoides posterior", "Pec deck inverso", "Tirar hacia la cara sin elevar hombros"],
      ["Aperturas en máquina", 2, "10", "60–90 s", "Pectoral", "Aperturas en polea", "No forzar estiramiento extremo"],
      ["Curl martillo", 2, "10", "60–90 s", "Bíceps / braquial", "Curl cuerda en polea", "Sin impulso del tronco"],
      ["Extensión tríceps sobre cabeza", 2, "10", "60–90 s", "Tríceps", "Extensión unilateral con mancuerna", "Codos controlados"],
      ["Pallof press", 2, "10/lado", "60 s", "Antirrotación / core", "Dead bug", "Exhalar durante la extensión"],
    ]),
];

export const STRENGTH_5D_PLAN: TrainingPlan = {
  id: "fuerza-integral-5d",
  title: "Fuerza Integral 5D",
  subtitle: "8 semanas · fuerza primero",
  description:
    "Cinco días de gimnasio de 60 a 90 minutos: superior, inferior, superior, inferior y superior. " +
    "88 series efectivas semanales distribuidas para mejorar la fuerza y desarrollar una base muscular equilibrada. " +
    "Sin pesos predefinidos y sin cardio obligatorio; la definición se aborda en una etapa posterior.",
  color: "#0A766E",
  coverImage: "/plans/fuerza-integral-5d-cover.svg",
  weeks: 8,
  mode: "straight",
  restSeconds: 180,
  published: true,
  sourceLabel: "Programa de fuerza · 5 días",
  notes: [
    "Cinco entrenamientos semanales de fuerza, de lunes a viernes. Sábado y domingo quedan libres. La actividad aeróbica, si se realiza, es adicional.",
    "Antes de cada sesión: 8–12 minutos de movilidad y 2–4 series de aproximación del primer ejercicio básico. No se cuentan entre las series efectivas.",
    "Las repeticiones son objetivos, no kilos prescritos. Utilizá cargas exigentes que permitan buena técnica; no busques el fallo técnico en los movimientos básicos.",
    "Descansá 3–4 minutos en los ejercicios principales y aproximadamente 60–120 segundos en accesorios, según el detalle de cada ejercicio. El temporizador general puede ajustarse.",
    "Semanas 1–2: consolidar técnica y descansos. Semanas 3–4: progresar si completás las series con control. Semanas 5–6: continuar o reducir temporalmente el volumen 30–50 % ante fatiga acumulada. Semanas 7–8: comparar el desempeño con la semana 1.",
    "Conservá las marcas por serie para evaluar fuerza. La futura fase de definición requerirá principalmente ajustes nutricionales mientras se mantiene entrenamiento de fuerza.",
  ],
  routine: { first: STRENGTH_5D_DAYS, second: STRENGTH_5D_DAYS },
};
