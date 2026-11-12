import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Image as ImageIcon,
  Play,
  Sparkles,
} from "lucide-react";
import { FitLayout } from "@/components/FitLayout";
import { VideoModal } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import {
  currentProgramDay,
  dateLabel,
  dayDate,
  dayKey,
  overdueDays,
  todayInZone,
} from "@/lib/fit";
import { LEVELS, LEVEL_VIDEO, PDF_NOTES, type Exercise } from "@shared/routine";
import {
  exerciseSets,
  planConfig,
  planDays,
  planTotalSessions,
  planVisibleWeeks,
  plannedExercises,
  MAX_TRAINING_WEEK,
} from "@shared/programs";

type Demo = Pick<
  Exercise,
  "name" | "videoUrl" | "tips" | "videoAlternative" | "sourceImage"
>;
export default function Program() {
  const { planUser: user, plan, planId, enrollment, progress } = useFit();
  const [video, setVideo] = useState<Demo | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  useEffect(() => setWeekOffset(0), [planId, user?.id]);
  const currentWeek = currentProgramDay(user, plan).week;
  const focusWeek = Math.max(1, Math.min(MAX_TRAINING_WEEK, currentWeek + weekOffset));
  const visibleWeeks = planVisibleWeeks(plan, currentWeek, focusWeek);
  const closeVideo = useCallback(() => setVideo(null), []);
  const pending = user && enrollment ? overdueDays(user, progress, plan) : [];
  const level = user?.level ?? "beginner";
  return (
    <FitLayout title="Mi programa">
      <section className="active-plan-strip">
        <Link href="/" className="text-link">
          ← Cambiar plan
        </Link>
        <span>
          <i />
          {plan.title}
        </span>
      </section>
      <section className="page-intro">
        <div>
          <span className="eyebrow">TU CAMINO, UN DÍA A LA VEZ</span>
          <h1>{plan.title}, a tu ritmo.</h1>
          <p>{plan.description}</p>
        </div>
        {plan.sourceUrl && (
          <a
            className="button secondary"
            href={plan.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Consultar material original ↗
          </a>
        )}
        {plan.isPersonal && (
          <Link href="/plan-personal" className="button secondary">
            Revisar mi selección <ArrowRight size={16} />
          </Link>
        )}
      </section>
      <section className="program-overview">
        <div>
          <span className="tiny-pill">{plan.title.toUpperCase()}</span>
          <h2>
            {plan.subtitle}.<br />
            <em>Un camino que es tuyo.</em>
          </h2>
          <p>
            {plan.sourceLabel} · cada sesión registra el progreso de este plan,
            sin mezclar tus otras rutinas.
          </p>
          <div className="program-details">
            <span>
              <CalendarDays size={16} />
              {plan.continuous
                ? "Duración continua"
                : `${plan.weeks} semanas de seguimiento`}
            </span>
            <span>
              <Dumbbell size={16} />
              {plan.continuous
                ? "Sesiones sin fecha límite"
                : `${planTotalSessions(plan)} sesiones`}
            </span>
            <span>
              <Sparkles size={16} />
              {plan.mode === "supersets"
                ? "3 niveles"
                : "Cantidades por ejercicio"}
            </span>
          </div>
        </div>
        <img src={plan.coverImage} alt={`Referencia de ${plan.title}`} />
      </section>
      {plan.mode === "supersets" ? (
        <section className="program-levels">
          <div className="section-heading">
            <div>
              <h2>La estructura de tu nivel</h2>
              <p>Las cantidades provienen de la tabla general del PDF.</p>
            </div>
            <button
              className="text-link"
              onClick={() =>
                setVideo({
                  name: "Explicación de niveles",
                  videoUrl: LEVEL_VIDEO,
                  tips: "Explicación original del programa de Pérdida de Peso.",
                })
              }
            >
              <Play size={13} />
              Ver explicación
            </button>
          </div>
          <div className="level-card-row">
            {Object.entries(LEVELS).map(([key, value]) => (
              <article
                className={`level-info-card ${key} ${key === level ? "current" : ""}`}
                key={key}
              >
                <div>
                  <span>{value.label}</span>
                  {key === level && (
                    <span className="current-label">TU NIVEL</span>
                  )}
                </div>
                <h3>
                  {value.rounds}
                  <small> rondas</small>
                </h3>
                <p>
                  {value.blocks === 1
                    ? "Super serie 1"
                    : `Super series 1${value.blocks === 2 ? " y 2" : ", 2 y 3"}`}
                </p>
                <ul>
                  <li>
                    <Check size={13} />
                    {value.reps} repeticiones
                  </li>
                  <li>
                    <Clock3 size={13} />
                    {value.restSeconds} s de descanso
                  </li>
                  <li>
                    <Dumbbell size={13} />
                    {value.cardioMinutes} min cardio
                  </li>
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="tone-source-summary">
          <ImageIcon size={23} />
          <div>
            <h3>Las cantidades están en cada ejercicio.</h3>
            <p>
              {plan.isPersonal
                ? "Se conserva el orden, los días y las cantidades que elegiste. No se añaden niveles ni cardio obligatorio. Estos ejercicios no tienen una demostración vinculada: revisá la técnica con tu profesional."
                : "Se conserva el orden y la dosificación de tus referencias. No se añaden niveles ni cardio obligatorio. Consulta la lámina del día para revisar la técnica."}
            </p>
          </div>
        </section>
      )}
      {pending.length > 0 && user?.remindersEnabled && (
        <div className="program-pending">
          <BellRing size={20} />
          <div>
            <strong>
              {pending.length} sesiones de {plan.title} te esperan
            </strong>
            <p>
              Retoma con calma. Los días sin sesión no se cuentan como
              atrasados.
            </p>
          </div>
        </div>
      )}
      {plan.continuous && (
        <div className="week-nav-controls" role="group" aria-label="Navegar calendario continuo">
          <button
            type="button"
            className="button secondary"
            disabled={focusWeek <= 1}
            onClick={() => setWeekOffset(value => Math.max(1 - currentWeek, value - 5))}
          >
            Ver semanas anteriores
          </button>
          <span>Semanas {visibleWeeks[0]}–{visibleWeeks.at(-1)}</span>
          <button
            type="button"
            className="button secondary"
            disabled={focusWeek >= MAX_TRAINING_WEEK - 1}
            onClick={() =>
              setWeekOffset(value =>
                Math.min(MAX_TRAINING_WEEK - currentWeek, value + 5)
              )
            }
          >
            Ver semanas siguientes
          </button>
        </div>
      )}
      <div className="program-weeks">
        {visibleWeeks.map(week => {
          const days = planDays(plan, week);
          return (
            <section className="program-week" key={week}>
              <div className="section-heading">
                <div className="week-heading">
                  <span>{String(week).padStart(2, "0")}</span>
                  <div>
                    <h2>Semana {week}</h2>
                    <p>
                      {user
                        ? `${dateLabel(dayDate(user.startDate, week, 1), true)} — ${dateLabel(dayDate(user.startDate, week, 7), true)}`
                        : plan.mode === "straight"
                          ? "Ciclo de seguimiento organizado por la app"
                          : "Estructura del PDF original"}
                    </p>
                  </div>
                </div>
                <span className="week-counter">
                  {
                    progress.filter(
                      p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
                    ).length
                  }{" "}
                  / {days.length} cumplidas
                </span>
              </div>
              <div className="calendar-session-list">
                {Array.from({ length: 7 }, (_, i) => i + 1).map(number => {
                  const day = days.find(d => d.day === number);
                  if (!day)
                    return (
                      <div className="calendar-rest" key={number}>
                        <Sparkles size={17} />
                        <div>
                          <strong>
                            {
                              [
                                "Lunes",
                                "Martes",
                                "Miércoles",
                                "Jueves",
                                "Viernes",
                                "Sábado",
                                "Domingo",
                              ][number - 1]
                            }{" "}
                            sin sesión
                          </strong>
                          <span>
                            No hay entrenamiento asignado en este plan.
                          </span>
                        </div>
                        <span className="status-pill">Descanso</span>
                      </div>
                    );
                  const record = progress.find(
                      p => p.dayKey === dayKey(week, number)
                    ),
                    overdue = pending.some(p => p.key === dayKey(week, number)),
                    date = user ? dayDate(user.startDate, week, number) : null,
                    today = date === todayInZone(user?.timezone);
                  const effectiveLevel = record?.level ?? level,
                    exercises = plannedExercises(
                      plan,
                      week,
                      number,
                      effectiveLevel
                    );
                  const sets = exercises.reduce(
                    (sum, e) => sum + exerciseSets(plan, e, effectiveLevel),
                    0
                  );
                  return (
                    <Link
                      href={`/entrenamiento?semana=${week}&dia=${number}`}
                      className={`calendar-session ${record?.completedAt ? "complete" : ""}`}
                      key={number}
                    >
                      <span className="calendar-day">
                        <small>{day.label.slice(0, 3)}</small>
                        <strong>
                          {date
                            ? new Date(`${date}T12:00:00`).getDate()
                            : String(number).padStart(2, "0")}
                        </strong>
                      </span>
                      <div>
                        <h3>{day.focus}</h3>
                        <span>
                          {exercises.length} ejercicios · {sets} series ·{" "}
                          {plan.mode === "supersets"
                            ? `${planConfig(plan, effectiveLevel).rounds} rondas`
                            : plan.isPersonal
                              ? "cantidades elegidas por vos"
                              : "cantidades de la lámina"}
                        </span>
                      </div>
                      <span
                        className={`status-pill ${record?.completedAt ? "complete" : overdue ? "pending" : today ? "today" : ""}`}
                      >
                        {record?.completedAt ? (
                          <>
                            <Check size={12} />
                            Cumplida
                          </>
                        ) : overdue ? (
                          "Pendiente"
                        ) : record?.completedSets.length ? (
                          "En progreso"
                        ) : today ? (
                          "Hoy"
                        ) : (
                          "Por hacer"
                        )}
                      </span>
                      <ArrowRight size={17} />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <section className="pdf-notes">
        <h3>Fuente y opciones de seguimiento</h3>
        {plan.mode === "supersets" &&
          PDF_NOTES.map(note => <p key={note.kind}>{note.text}</p>)}
        {plan.notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))}
        <p>
          La app organiza el plan, no sustituye una evaluación profesional ni
          garantiza cambios corporales. Detente ante dolor, mareo o pérdida de
          técnica.
        </p>
      </section>
      <VideoModal exercise={video} onClose={closeVideo} />
    </FitLayout>
  );
}
