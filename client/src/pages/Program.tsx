import { useCallback, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Play,
  Sparkles,
} from "lucide-react";
import { FitLayout } from "@/components/FitLayout";
import { VideoModal } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import {
  dateLabel,
  dayDate,
  dayKey,
  overdueDays,
  todayInZone,
} from "@/lib/fit";
import {
  LEVELS,
  LEVEL_VIDEO,
  PDF_NOTES,
  ROUTINE,
  type Exercise,
} from "@shared/routine";

export default function Program() {
  const { user, progress } = useFit();
  const [video, setVideo] = useState<Pick<
    Exercise,
    "name" | "videoUrl" | "tips"
  > | null>(null);
  const closeVideo = useCallback(() => setVideo(null), []);
  const pending = user ? overdueDays(user, progress) : [];
  const level = LEVELS[user?.level ?? "beginner"];
  return (
    <FitLayout title="Mi programa">
      <section className="page-intro">
        <div>
          <span className="eyebrow">TU CAMINO, UN DÍA A LA VEZ</span>
          <h1>Cuatro semanas para ti.</h1>
          <p>
            Un solo programa. Una estructura clara. Tu constancia hace el resto.
          </p>
        </div>
        <a
          className="button secondary"
          href="/programa-perdida-de-peso.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Consultar PDF original ↗
        </a>
      </section>
      <section className="program-overview">
        <div>
          <span className="tiny-pill">PÉRDIDA DE PESO</span>
          <h2>
            Fuerza + movimiento.
            <br />
            <em>Un cambio sostenible.</em>
          </h2>
          <p>
            El programa original combina fuerza, super series y cardio de lunes
            a sábado, con recuperación el domingo.
          </p>
          <div className="program-details">
            <span>
              <CalendarDays size={16} /> 4 semanas
            </span>
            <span>
              <Dumbbell size={16} /> 24 sesiones
            </span>
            <span>
              <Sparkles size={16} /> 3 niveles
            </span>
          </div>
        </div>
        <img
          src="/exercises/program-banner.png"
          alt="Imagen del programa original Pérdida de Peso"
        />
      </section>
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
                name: "Explicación de niveles del programa",
                videoUrl: LEVEL_VIDEO,
                tips: "Sigue la explicación original para entender cómo enlazar los bloques y repetir las rondas.",
              })
            }
          >
            <Play size={13} fill="currentColor" /> Ver explicación original
          </button>
        </div>
        <div className="level-card-row">
          {Object.entries(LEVELS).map(([key, value]) => (
            <article
              className={`level-info-card ${key} ${key === (user?.level ?? "beginner") ? "current" : ""}`}
              key={key}
            >
              <div>
                <span>{value.label}</span>
                {key === (user?.level ?? "beginner") && (
                  <span className="current-label">
                    {user ? "TU NIVEL" : "VISTA INICIAL"}
                  </span>
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
                  <Check size={13} /> {value.reps} repeticiones
                </li>
                <li>
                  <Clock3 size={13} />{" "}
                  {value.restSeconds === 90
                    ? "1:30 min"
                    : value.restSeconds / 60 + " min"}{" "}
                  de descanso
                </li>
                <li>
                  <Dumbbell size={13} /> {value.cardioMinutes} min de cardio
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>
      {pending.length > 0 && user?.remindersEnabled && (
        <div className="program-pending">
          <BellRing size={20} />
          <div>
            <strong>
              {pending.length}{" "}
              {pending.length === 1
                ? "sesión te espera"
                : "sesiones te esperan"}
            </strong>
            <p>
              Las verás señaladas abajo. Retoma con calma; no juntes varias
              sesiones para compensar.
            </p>
          </div>
        </div>
      )}
      <div className="program-weeks">
        {[1, 2, 3, 4].map(week => (
          <section className="program-week" key={week}>
            <div className="section-heading">
              <div className="week-heading">
                <span>0{week}</span>
                <div>
                  <h2>Semana {week}</h2>
                  <p>
                    {user
                      ? dateLabel(dayDate(user.startDate, week, 1), true) +
                        " — " +
                        dateLabel(dayDate(user.startDate, week, 7), true)
                      : week <= 2
                        ? "Primer bloque del programa"
                        : "Segundo bloque del programa"}
                  </p>
                </div>
              </div>
              <span className="week-counter">
                {
                  progress.filter(
                    p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
                  ).length
                }{" "}
                / 6 cumplidas
              </span>
            </div>
            <div className="calendar-session-list">
              {ROUTINE[week <= 2 ? "first" : "second"].map(day => {
                const record = progress.find(
                  p => p.dayKey === dayKey(week, day.day)
                );
                const overdue = pending.some(
                  p => p.key === dayKey(week, day.day)
                );
                const date = user
                  ? dayDate(user.startDate, week, day.day)
                  : null;
                const today = date === todayInZone(user?.timezone);
                return (
                  <Link
                    href={`/?semana=${week}&dia=${day.day}`}
                    className={`calendar-session ${record?.completedAt ? "complete" : ""}`}
                    key={day.day}
                  >
                    <span className="calendar-day">
                      <small>{day.label.slice(0, 3)}</small>
                      <strong>
                        {date
                          ? new Date(`${date}T12:00:00`).getDate()
                          : String(day.day).padStart(2, "0")}
                      </strong>
                    </span>
                    <div>
                      <h3>{day.focus}</h3>
                      <span>
                        {
                          day.exercises.filter(e => e.block <= level.blocks)
                            .length
                        }{" "}
                        ejercicios · {level.rounds} rondas
                      </span>
                    </div>
                    <span
                      className={`status-pill ${record?.completedAt ? "complete" : overdue ? "pending" : today ? "today" : ""}`}
                    >
                      {record?.completedAt ? (
                        <>
                          <Check size={12} /> Cumplida
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
              <div className="calendar-rest">
                <Sparkles size={17} />
                <div>
                  <strong>Domingo de recuperación</strong>
                  <span>Tu descanso también forma parte del programa.</span>
                </div>
                <span className="status-pill">Descanso</span>
              </div>
            </div>
          </section>
        ))}
      </div>
      <section className="pdf-notes">
        <h3>Notas importantes del documento original</h3>
        {PDF_NOTES.map(note => (
          <p key={note.kind}>{note.text}</p>
        ))}
        <p>
          La app organiza el plan, no sustituye una evaluación profesional.
          Confirma el nivel y las variantes de salto si tienes alguna
          limitación, y detente ante dolor o mareo.
        </p>
      </section>
      <VideoModal exercise={video} onClose={closeVideo} />
    </FitLayout>
  );
}
