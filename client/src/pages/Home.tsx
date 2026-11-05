import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  Play,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import {
  StarCelebration,
  TimerCard,
  VideoModal,
} from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import {
  currentProgramDay,
  dayDate,
  dayKey,
  dateLabel,
  overdueDays,
  type Progress,
} from "@/lib/fit";
import {
  LEVELS,
  ROUTINE,
  STRETCH,
  WARMUP_LOWER,
  WARMUP_UPPER,
  type Exercise,
  type Level,
} from "@shared/routine";
import { VIDEO_ALTERNATIVES } from "@shared/video-alternatives";

export default function Home() {
  const { user, loading, progress, overrides, updateProfile, writeProgress } =
    useFit();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
  const [guestLevel, setGuestLevel] = useState<Level>("beginner");
  const [video, setVideo] = useState<Pick<
    Exercise,
    "name" | "videoUrl" | "tips" | "videoAlternative"
  > | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [training, setTraining] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const closeVideo = useCallback(() => setVideo(null), []);
  const closeCelebration = useCallback(() => setCelebration(null), []);
  useEffect(() => {
    const current = currentProgramDay(user);
    const params = new URLSearchParams(search);
    const queryWeek = Number(params.get("semana"));
    const queryDay = Number(params.get("dia"));
    setWeek(queryWeek >= 1 && queryWeek <= 4 ? queryWeek : current.week);
    setDay(queryDay >= 1 && queryDay <= 7 ? queryDay : current.day);
    setTraining(false);
  }, [user?.id, search]);
  const key = dayKey(week, day);
  const savedRecord = progress.find(p => p.dayKey === key);
  const selectedLevel = user?.level ?? guestLevel;
  const level = savedRecord?.level ?? selectedLevel;
  const config = LEVELS[level];
  const days = ROUTINE[week <= 2 ? "first" : "second"];
  const routine = days.find(d => d.day === day) ?? days[0];
  const exercises = routine.exercises
    .filter(e => e.block <= config.blocks)
    .map(e => {
      const override = overrides.find(o => o.exerciseId === e.id);
      return {
        ...e,
        ...(override ?? {}),
        videoAlternative:
          override && override.name !== e.name
            ? undefined
            : (VIDEO_ALTERNATIVES[e.name] ?? e.videoAlternative),
      };
    });
  const record: Progress = savedRecord ?? {
    dayKey: key,
    completedSets: [],
    cardioDone: false,
    warmupDone: false,
    completedAt: null,
    updatedAt: "",
  };
  const requiredSets = exercises.flatMap(e =>
    Array.from({ length: config.rounds }, (_, i) => `${e.id}:${i + 1}`)
  );
  const completedCount = requiredSets.filter(id =>
    record.completedSets.includes(id)
  ).length;
  const percent = Math.round(
    ((completedCount + (record.cardioDone ? 1 : 0)) /
      (requiredSets.length + 1)) *
      100
  );
  const allComplete = !!record.completedAt;
  const totalCompleted = progress.filter(p => p.completedAt).length;
  const totalSets = progress.reduce(
    (sum, p) => sum + p.completedSets.length,
    0
  );
  const weekCompleted = progress.filter(
    p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
  ).length;
  const pending =
    user && user.remindersEnabled ? overdueDays(user, progress) : [];
  const changeLevel = async (next: Level) => {
    if (!user) return setGuestLevel(next);
    setBusy(true);
    try {
      await updateProfile({ level: next });
      toast.success("Nivel actualizado.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const persist = async (
    changes: Partial<
      Pick<Progress, "completedSets" | "cardioDone" | "warmupDone">
    >,
    message?: string
  ) => {
    if (!user) {
      navigate("/acceso?registro=1");
      return;
    }
    setBusy(true);
    try {
      const next = await writeProgress(key, {
        completedSets: record.completedSets,
        cardioDone: record.cardioDone,
        warmupDone: record.warmupDone,
        ...changes,
      });
      if (next.completedAt && !record.completedAt)
        setCelebration("¡Rutina cumplida! Esta estrella es tuya.");
      else if (message) setCelebration(message);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const toggleSet = (exercise: Exercise, round: number) => {
    const id = `${exercise.id}:${round}`;
    const next = record.completedSets.includes(id)
      ? record.completedSets.filter(s => s !== id)
      : [...record.completedSets, id];
    const groupComplete = exercises
      .filter(e => e.block === exercise.block)
      .every(e => next.includes(`${e.id}:${round}`));
    const exerciseComplete = Array.from(
      { length: config.rounds },
      (_, i) => `${exercise.id}:${i + 1}`
    ).every(s => next.includes(s));
    void persist(
      { completedSets: next },
      groupComplete && !record.completedSets.includes(id)
        ? `¡Ronda ${round} de la super serie cumplida!`
        : exerciseComplete && !record.completedSets.includes(id)
          ? "¡Ejercicio cumplido! Sigue a tu ritmo."
          : !record.completedSets.includes(id)
            ? `¡Serie ${round} cumplida! Tu esfuerzo suma.`
            : undefined
    );
  };
  const toggleExercise = (exercise: Exercise) => {
    const ids = Array.from(
      { length: config.rounds },
      (_, i) => `${exercise.id}:${i + 1}`
    );
    const done = ids.every(id => record.completedSets.includes(id));
    const next = done
      ? record.completedSets.filter(id => !ids.includes(id))
      : Array.from(new Set([...record.completedSets, ...ids]));
    void persist(
      { completedSets: next },
      done ? undefined : "¡Ejercicio cumplido! Un paso más."
    );
  };
  const showWarmup = () =>
    setVideo({
      name:
        routine.focus.includes("Brazos") || day === 4
          ? "Calentamiento de tren superior"
          : "Calentamiento de tren inferior",
      videoUrl: day === 2 || day === 4 ? WARMUP_UPPER : WARMUP_LOWER,
      tips: "Prepara tu cuerpo antes de comenzar. Sigue la demostración de calentamiento que acompaña tu programa.",
    });
  const start = () => {
    if (!user) return navigate("/acceso?registro=1");
    setTraining(true);
    document
      .getElementById("session-exercises")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <FitLayout>
      <section className="page-intro">
        <div>
          <span className="eyebrow">CADA SESIÓN CUENTA</span>
          <h1>
            {user
              ? `Vamos con todo, ${user.fullName.split(" ")[0]}.`
              : "Tu mejor versión empieza aquí."}
            <span className="intro-sparkle">
              <Sparkles size={25} />
            </span>
          </h1>
          <p>
            {user
              ? "Un día a la vez. Un paso más cerca de tu objetivo."
              : "No necesitas hacerlo perfecto. Solo necesitas seguir a tu ritmo."}
          </p>
        </div>
        <div className="level-picker">
          <span>MI NIVEL</span>
          <div>
            <span className={`level-dot ${selectedLevel}`} />
            <select
              aria-label="Seleccionar nivel"
              value={selectedLevel}
              disabled={busy}
              onChange={e => void changeLevel(e.target.value as Level)}
            >
              {Object.entries(LEVELS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </section>
      <section className="metrics-row">
        <div className="metric">
          <span className="metric-icon blush">
            <Target size={20} />
          </span>
          <div>
            <span>Programa completado</span>
            <strong>
              {totalCompleted}
              <small> / 24 sesiones</small>
            </strong>
          </div>
          <div className="mini-track">
            <i style={{ width: `${(totalCompleted / 24) * 100}%` }} />
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon peach">
            <Flame size={20} />
          </span>
          <div>
            <span>Tu trabajo acumulado</span>
            <strong>
              {totalSets}
              <small> series realizadas</small>
            </strong>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon lavender">
            <Star size={20} />
          </span>
          <div>
            <span>Estrellas ganadas</span>
            <strong>
              {totalCompleted}
              <small> logros de constancia</small>
            </strong>
          </div>
        </div>
      </section>
      {!user && !loading && (
        <div className="guest-notice">
          <LockLabel />
          <span>
            Explora tu rutina. Crea una cuenta para guardar tus series y ver tu
            progreso.
          </span>
          <Link href="/acceso?registro=1">
            Crear mi espacio <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="dashboard-columns">
        <div className="training-column">
          <section className="workout-hero">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="hero-white-pill">PÉRDIDA DE PESO</span>
                <span>SEMANA {week} DE 4</span>
              </div>
              <span className="hero-day">
                {day === 7
                  ? "DOMINGO · RECUPERACIÓN"
                  : `${routine.label.toUpperCase()} · TU ENTRENAMIENTO`}
              </span>
              <h2>
                {day === 7 ? (
                  <>
                    Recuperar también
                    <br />
                    es avanzar.
                  </>
                ) : (
                  <>
                    {routine.focus}.<br />
                    <em>
                      {day === 2 || day === 4
                        ? "Tu fuerza, tu cambio."
                        : "Construye tu mejor versión."}
                    </em>
                  </>
                )}
              </h2>
              <p>
                {day === 7
                  ? "Hoy tu cuerpo se recupera. No hay una sesión de entrenamiento programada."
                  : routine.subtitle}
              </p>
              {day !== 7 && (
                <div className="hero-details">
                  <span>
                    <Dumbbell size={15} /> {exercises.length} ejercicios
                  </span>
                  <span>
                    <Clock3 size={15} /> {config.cardioMinutes} min de cardio
                  </span>
                </div>
              )}
              <button
                className="button hero-button"
                onClick={day === 7 ? () => navigate("/programa") : start}
              >
                {day === 7
                  ? "Ver mi semana"
                  : allComplete
                    ? "Revisar mi entrenamiento"
                    : training || completedCount
                      ? "Continuar entrenamiento"
                      : "Comenzar entrenamiento"}
                {day === 7 ? (
                  <ArrowRight size={16} />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
              </button>
            </div>
            <div className="hero-art">
              <div className="hero-ring ring-one" />
              <div className="hero-ring ring-two" />
              <div className="hero-emblem">
                <Dumbbell size={42} strokeWidth={1.35} />
              </div>
              <div className="hero-program-mark">
                4
                <span>
                  SEMANAS
                  <br />
                  DE CAMBIO
                </span>
              </div>
              <span className="hero-art-caption">FUERZA + CONSTANCIA</span>
            </div>
          </section>
          <section className="week-selector">
            <div className="section-heading">
              <div>
                <h2>Tu semana, a tu ritmo</h2>
                <p>
                  {user
                    ? dateLabel(dayDate(user.startDate, week, 1), true) +
                      " — " +
                      dateLabel(dayDate(user.startDate, week, 7), true)
                    : "6 días de entrenamiento · 1 día de recuperación"}
                </p>
              </div>
              <select
                aria-label="Seleccionar semana"
                value={week}
                onChange={e => {
                  setWeek(Number(e.target.value));
                  setTraining(false);
                }}
                className="week-select"
              >
                {[1, 2, 3, 4].map(w => (
                  <option key={w} value={w}>
                    Semana {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="day-selector">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                (label, index) => {
                  const done = progress.some(
                    p => p.dayKey === dayKey(week, index + 1) && p.completedAt
                  );
                  return (
                    <button
                      key={label}
                      className={`day-chip ${day === index + 1 ? "active" : ""} ${done ? "done" : ""} ${index === 6 ? "rest-day" : ""}`}
                      onClick={() => {
                        setDay(index + 1);
                        setTraining(false);
                      }}
                    >
                      <span>{label}</span>
                      <strong>
                        {user
                          ? new Date(
                              `${dayDate(user.startDate, week, index + 1)}T12:00:00`
                            ).getDate()
                          : String(index + 1).padStart(2, "0")}
                      </strong>
                      <small>
                        {done ? (
                          <Check size={11} />
                        ) : index === 6 ? (
                          "Descanso"
                        ) : (
                          [
                            "Piernas",
                            "Brazos",
                            "Glúteos",
                            "Espalda",
                            "Piernas",
                            "Abdomen",
                          ][index]
                        )}
                      </small>
                    </button>
                  );
                }
              )}
            </div>
          </section>
          {day !== 7 ? (
            <section className="session-section" id="session-exercises">
              <div className="section-heading">
                <div>
                  <h2>Tu sesión de {routine.label.toLowerCase()}</h2>
                  <p>
                    {config.reps} repeticiones por ejercicio · {config.rounds}{" "}
                    rondas por super serie
                  </p>
                </div>
                <button
                  className="text-link guide-toggle"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <CircleHelp size={15} /> Cómo entrenar
                </button>
              </div>
              {showGuide && (
                <div className="guide-box">
                  <h3>Así funciona tu nivel {config.label.toLowerCase()}</h3>
                  <p>
                    Haz los ejercicios de cada super serie uno tras otro, sin
                    descanso entre ellos. Descansa{" "}
                    {config.restSeconds === 90
                      ? "1:30 minutos"
                      : config.restSeconds / 60 + " minutos"}{" "}
                    al terminar cada bloque. Completa los {config.blocks}{" "}
                    {config.blocks === 1 ? "bloque" : "bloques"} y repite el
                    recorrido {config.rounds} veces. Termina con{" "}
                    {config.cardioMinutes} minutos de cardio.
                  </p>
                  <p className="source-note">
                    Usamos las cantidades de la tabla general del PDF. Excepción
                    del ejemplo: desplante fijo con salto para principiante, 30
                    segundos por pierna. La mención “12–25” de Smith en el
                    ejemplo intermedio contradice la tabla; se mantiene 12–15.
                    El sprint no incluye duración en el PDF: confirma la
                    dosificación con tu profesional, no se asigna una duración
                    nueva.
                  </p>
                </div>
              )}
              <div className="warmup-bar">
                <div className="warmup-icon">
                  <Flame size={18} />
                </div>
                <div>
                  <strong>Primero, prepara tu cuerpo</strong>
                  <span>El calentamiento es parte del proceso.</span>
                </div>
                <button className="text-link" onClick={showWarmup}>
                  <Play size={12} fill="currentColor" /> Ver calentamiento
                </button>
                <button
                  className={`small-check ${record.warmupDone ? "checked" : ""}`}
                  disabled={busy}
                  aria-label={
                    record.warmupDone
                      ? "Desmarcar calentamiento realizado"
                      : "Marcar calentamiento realizado"
                  }
                  onClick={() =>
                    void persist({ warmupDone: !record.warmupDone })
                  }
                >
                  <Check size={14} />
                </button>
              </div>
              {Array.from(
                { length: config.blocks },
                (_, index) => index + 1
              ).map(block => (
                <section
                  className={`superset block-${block}`}
                  key={`${key}-${block}`}
                >
                  <div className="superset-heading">
                    <div>
                      <span className="block-number">0{block}</span>
                      <div>
                        <h3>Super serie {block}</h3>
                        <span>
                          {exercises.filter(e => e.block === block).length}{" "}
                          ejercicios · {config.rounds} rondas
                        </span>
                      </div>
                    </div>
                    <span className="superset-tag">
                      {block === 1
                        ? "BASE"
                        : block === 2
                          ? "INTERMEDIO"
                          : "AVANZADO"}
                    </span>
                  </div>
                  <div className="exercise-list">
                    {exercises
                      .filter(e => e.block === block)
                      .map((exercise, index) => {
                        const ids = Array.from(
                          { length: config.rounds },
                          (_, i) => `${exercise.id}:${i + 1}`
                        );
                        const done = ids.every(id =>
                          record.completedSets.includes(id)
                        );
                        const reps =
                          level === "beginner" && exercise.id === "p22-e2"
                            ? "30 s por pierna"
                            : config.reps + " repeticiones";
                        return (
                          <article
                            className={`exercise-row ${done ? "completed" : ""}`}
                            key={exercise.id}
                          >
                            <button
                              className="exercise-thumbnail"
                              aria-label={`Ver cómo hacer ${exercise.name}`}
                              onClick={() => setVideo(exercise)}
                            >
                              <img
                                src={exercise.thumbnail}
                                alt={exercise.name}
                                loading="lazy"
                              />
                              <span>
                                <Play size={14} fill="currentColor" />
                              </span>
                            </button>
                            <div className="exercise-copy">
                              <span className="exercise-order">
                                EJERCICIO {String(index + 1).padStart(2, "0")}
                              </span>
                              <button
                                className="exercise-name"
                                onClick={() => setVideo(exercise)}
                              >
                                {exercise.name}
                              </button>
                              <span className="exercise-reps">{reps}</span>
                              <button
                                className="exercise-video-link"
                                onClick={() => setVideo(exercise)}
                              >
                                Ver técnica <ArrowRight size={11} />
                              </button>
                            </div>
                            <div className="exercise-controls">
                              <span className="sets-label">TUS SERIES</span>
                              <div className="set-buttons">
                                {ids.map((id, i) => (
                                  <button
                                    key={id}
                                    className={`set-button ${record.completedSets.includes(id) ? "checked" : ""}`}
                                    disabled={busy}
                                    aria-label={`${record.completedSets.includes(id) ? "Desmarcar" : "Completar"} serie ${i + 1} de ${exercise.name}`}
                                    aria-pressed={record.completedSets.includes(
                                      id
                                    )}
                                    onClick={() => toggleSet(exercise, i + 1)}
                                  >
                                    {record.completedSets.includes(id) ? (
                                      <Check size={14} strokeWidth={2.7} />
                                    ) : (
                                      i + 1
                                    )}
                                  </button>
                                ))}
                              </div>
                              <button
                                className={`exercise-done-button ${done ? "checked" : ""}`}
                                disabled={busy}
                                onClick={() => toggleExercise(exercise)}
                              >
                                {done ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <span className="empty-circle" />
                                )}
                                {done
                                  ? "Ejercicio realizado"
                                  : "Marcar ejercicio"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                  <div className="superset-footer">
                    <Clock3 size={13} />
                    <span>
                      Al terminar el bloque, descansa{" "}
                      <strong>
                        {Math.floor(config.restSeconds / 60)}:
                        {String(config.restSeconds % 60).padStart(2, "0")}
                      </strong>{" "}
                      y toma agua.
                    </span>
                  </div>
                </section>
              ))}
              <div
                className={`cardio-completion ${record.cardioDone ? "done" : ""}`}
              >
                <div className="cardio-icon">
                  <Flame size={21} />
                </div>
                <div>
                  <h3>El último paso: tu cardio</h3>
                  <p>
                    {config.cardioMinutes} minutos según tu nivel · intensidad
                    adecuada para ti
                  </p>
                </div>
                <button
                  className={`button ${record.cardioDone ? "secondary" : "primary"}`}
                  disabled={busy}
                  onClick={() =>
                    void persist(
                      { cardioDone: !record.cardioDone },
                      record.cardioDone
                        ? undefined
                        : "¡Cardio cumplido! Tu constancia suma."
                    )
                  }
                >
                  {record.cardioDone ? (
                    <Check size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {record.cardioDone ? "Cardio realizado" : "Marcar cardio"}
                </button>
              </div>
              <div className="session-bottom">
                <span>
                  {allComplete ? (
                    <>
                      <Star size={15} fill="currentColor" /> Tu estrella está
                      guardada. ¡Sesión cumplida!
                    </>
                  ) : (
                    <>
                      {completedCount} de {requiredSets.length} series
                      realizadas. Tu avance se guarda al marcar.
                    </>
                  )}
                </span>
                <button
                  className="text-link"
                  onClick={() =>
                    setVideo({
                      name: "Estiramiento del programa",
                      videoUrl: STRETCH,
                      tips: "Cierra tu entrenamiento con movimientos suaves y controlados. No fuerces el rango de movimiento.",
                    })
                  }
                >
                  Ver estiramiento <ArrowRight size={14} />
                </button>
              </div>
            </section>
          ) : (
            <section className="rest-panel">
              <span className="metric-icon lavender">
                <Sparkles size={25} />
              </span>
              <h2>Hoy, dale espacio a tu recuperación.</h2>
              <p>
                Tu programa reserva el domingo para descansar. No hay ejercicios
                adicionales ni series por completar.
              </p>
              <Link href="/programa" className="button secondary">
                Preparar mi próxima semana <ArrowRight size={16} />
              </Link>
            </section>
          )}
        </div>
        <aside className="progress-column">
          <section className="weekly-card">
            <div className="section-small-title">
              <Award size={19} />
              <h3>
                Pequeños pasos.
                <br />
                Grandes cambios.
              </h3>
            </div>
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(#e9387a ${(weekCompleted / 6) * 360}deg, #f7dce7 0deg)`,
              }}
            >
              <div>
                <strong>
                  {weekCompleted}
                  <small>/6</small>
                </strong>
                <span>sesiones esta semana</span>
              </div>
            </div>
            <div className="weekly-stars">
              {Array.from({ length: 6 }, (_, i) => (
                <Star
                  key={i}
                  size={22}
                  fill={i < weekCompleted ? "currentColor" : "none"}
                  className={i < weekCompleted ? "earned" : ""}
                />
              ))}
            </div>
            <p>
              {weekCompleted === 6
                ? "¡Semana cumplida! Celebra tu constancia."
                : "Cada estrella es una sesión que hiciste por ti."}
            </p>
            <Link href="/progreso" className="text-link">
              Ver mi progreso <ArrowRight size={14} />
            </Link>
          </section>
          {day !== 7 && (
            <section className="session-progress-card">
              <div>
                <span>AVANCE DE TU SESIÓN</span>
                <strong>{percent}%</strong>
              </div>
              <div className="session-track">
                <i style={{ width: `${percent}%` }} />
              </div>
              <p>
                {allComplete
                  ? "¡Lo hiciste! Tu progreso está guardado."
                  : `${completedCount}/${requiredSets.length} series · cardio ${record.cardioDone ? "realizado" : "pendiente"}`}
              </p>
            </section>
          )}
          <TimerCard
            restSeconds={config.restSeconds}
            cardioMinutes={config.cardioMinutes}
            onCardioComplete={() => {
              if (!record.cardioDone)
                void persist({ cardioDone: true }, "¡Cardio cumplido!");
            }}
          />
          <section
            className={`reminder-card ${pending.length ? "overdue" : ""}`}
          >
            <BellRing size={20} />
            <h3>
              {pending.length ? "Tu rutina te espera" : "Haz espacio para ti"}
            </h3>
            <p>
              {pending.length
                ? `Tienes ${pending.length} ${pending.length === 1 ? "sesión pendiente" : "sesiones pendientes"}. Retoma con calma; no acumules entrenamientos para compensar.`
                : user
                  ? user.remindersEnabled
                    ? `Tu recordatorio está fijado a las ${user.reminderTime}. Te avisaremos aquí si una sesión queda pendiente.`
                    : "Activa los recordatorios en Mi cuenta para identificar tus rutinas pendientes."
                  : "Elige tu horario al crear tu cuenta y mantén tus pendientes a la vista."}
            </p>
            <Link
              href={
                pending.length
                  ? "/programa"
                  : user
                    ? "/ajustes"
                    : "/acceso?registro=1"
              }
              className="text-link"
            >
              {pending.length
                ? "Ver sesiones pendientes"
                : "Organizar mi horario"}
              <ArrowRight size={13} />
            </Link>
          </section>
          <div className="daily-quote">
            <span>UN RECORDATORIO PARA TI</span>
            <p>
              “La constancia
              <br />
              le gana al
              <br />
              <em>perfeccionismo.</em>”
            </p>
            <div />
            <small>NO LO OLVIDES. SIGUE.</small>
          </div>
        </aside>
      </div>
      <VideoModal exercise={video} onClose={closeVideo} />
      <StarCelebration message={celebration} onClose={closeCelebration} />
    </FitLayout>
  );
}
function LockLabel() {
  return <Sparkles size={16} />;
}
