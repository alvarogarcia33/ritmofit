import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowRight,
  Award,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  Image as ImageIcon,
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
  type TimerSnapshot,
} from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import {
  api,
  currentProgramDay,
  dayDate,
  dayKey,
  dateLabel,
  overdueDays,
  type Progress,
  type PersonalPlanArchive,
} from "@/lib/fit";
import { previousExerciseMarks } from "@/lib/strength";
import {
  mergeExerciseMarks,
  hasUnsavedExerciseMarks,
  type SetMarkDraft,
} from "@/lib/quick-sets";
import { formatSetMark } from "@shared/set-performance";
import {
  LEVELS,
  STRETCH,
  WARMUP_LOWER,
  WARMUP_UPPER,
  type Exercise,
  type Level,
} from "@shared/routine";
import {
  exerciseSets,
  planConfig,
  planDays,
  planTotalSessions,
  planAllowsWeek,
  planVisibleWeeks,
  MAX_TRAINING_WEEK,
  plannedExercises,
} from "@shared/programs";
import { PERSONAL_PLAN_ID_PREFIX } from "@shared/exercise-library";
import { VIDEO_ALTERNATIVES } from "@shared/video-alternatives";
import { withPersonalDemo, type PersonalExerciseMedia } from "@shared/personal-exercise-media";

type Demonstration = Pick<
  Exercise,
  "name" | "videoUrl" | "tips" | "videoAlternative" | "sourceImage" | "demoCredit" | "demoGuide"
>;
export default function Home() {
  const {
    user: account,
    planUser: user,
    loading,
    planLoading,
    plan,
    planId,
    enrollment,
    progress,
    overrides,
    updatePlanPreferences,
    writeProgress,
  } = useFit();
  const isPersonalPlan = Boolean(
    plan.isPersonal || planId.startsWith(PERSONAL_PLAN_ID_PREFIX)
  );
  const [, navigate] = useLocation();
  const search = useSearch();
  const [week, setWeek] = useState(1),
    [day, setDay] = useState(1);
  const [guestLevel, setGuestLevel] = useState<Level>("beginner");
  const [archivedPlans, setArchivedPlans] = useState<PersonalPlanArchive[]>([]);
  const [personalMedia, setPersonalMedia] = useState<PersonalExerciseMedia[]>([]);
  const [markDrafts, setMarkDrafts] = useState<
    Record<string, SetMarkDraft>
  >({});
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>({
    mode: "rest", remaining: 90, running: false, finished: false,
  });
  const onTimerSnapshot = useCallback((snapshot: TimerSnapshot) => {
    setTimerSnapshot(previous =>
      previous.mode === snapshot.mode &&
      previous.remaining === snapshot.remaining &&
      previous.running === snapshot.running &&
      previous.finished === snapshot.finished
        ? previous : snapshot
    );
  }, []);
  const [video, setVideo] = useState<Demonstration | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [saving, setSaving] = useState(false),
    [training, setTraining] = useState(false),
    [showGuide, setShowGuide] = useState(false);
  const [exerciseClock, setExerciseClock] = useState<{
    seconds: number;
    label: string;
  } | null>(null);
  const closeVideo = useCallback(() => setVideo(null), []),
    closeCelebration = useCallback(() => setCelebration(null), []);
  useEffect(() => {
    const current = currentProgramDay(user, plan),
      params = new URLSearchParams(search);
    const w = Number(params.get("semana")),
      d = Number(params.get("dia"));
    setWeek(planAllowsWeek(plan, w) ? w : current.week);
    setDay(d >= 1 && d <= 7 ? d : current.day);
    setTraining(false);
    setExerciseClock(null);
    setVideo(null);
  }, [user?.id, user?.startDate, planId, plan.weeks, plan.continuous, search]);
  const key = dayKey(week, day),
    savedRecord = progress.find(p => p.dayKey === key);
  const selectedLevel = user?.level ?? guestLevel,
    level = savedRecord?.level ?? selectedLevel;
  const config = planConfig(plan, level),
    days = planDays(plan, week),
    routine = days.find(d => d.day === day),
    isRest = !routine;
  const restSeconds = enrollment?.restSeconds ?? config.restSeconds;
  const exercises = plannedExercises(plan, week, day, level).map(e => {
    const override =
      planId === "adelgazar"
        ? overrides.find(o => o.exerciseId === e.id)
        : undefined;
    const exercise = {
      ...e,
      ...(override ?? {}),
      videoAlternative:
        planId === "adelgazar"
          ? override && override.name !== e.name
            ? undefined
            : (VIDEO_ALTERNATIVES[e.name] ?? e.videoAlternative)
          : e.videoAlternative,
    };
    return isPersonalPlan
      ? withPersonalDemo(exercise, personalMedia)
      : exercise;
  });
  const record: Progress = savedRecord ?? {
    dayKey: key,
    completedSets: [],
    cardioDone: false,
    warmupDone: false,
    completedAt: null,
    updatedAt: "",
  };
  useEffect(() => {
    if (planLoading || loading) return;
    const next: Record<string, { weightKg: string; reps: string }> = {};
    for (const mark of record.setPerformance ?? []) {
      next[mark.setKey] = {
        weightKg: mark.weightKg === null ? "" : String(mark.weightKg),
        reps: mark.reps === null ? "" : String(mark.reps),
      };
    }
    setMarkDrafts(next);
  }, [planId, key, planLoading, loading]);

  useEffect(() => {
    if (!account || !isPersonalPlan) {
      setPersonalMedia([]);
      return;
    }
    let active = true;
    void api<{ media: PersonalExerciseMedia[] }>("/personal-exercises/media")
      .then(data => { if (active) setPersonalMedia(data.media); })
      .catch(() => { if (active) setPersonalMedia([]); });
    return () => { active = false; };
  }, [account?.id, isPersonalPlan]);

  useEffect(() => {
    if (!account || !isPersonalPlan) {
      setArchivedPlans([]);
      return;
    }
    let current = true;
    void api<{ versions: PersonalPlanArchive[] }>("/personal-plan/versions")
      .then(result => {
        if (current) setArchivedPlans(result.versions);
      })
      .catch(() => {
        if (current) setArchivedPlans([]);
      });
    return () => {
      current = false;
    };
  }, [account?.id, planId, isPersonalPlan]);

  const requiredSets = exercises.flatMap(e =>
    Array.from(
      { length: exerciseSets(plan, e, level) },
      (_, i) => `${e.id}:${i + 1}`
    )
  );
  const completedCount = requiredSets.filter(id =>
    record.completedSets.includes(id)
  ).length;
  const cardioRequired = config.cardioMinutes > 0;
  const percent = Math.round(
    ((completedCount + (cardioRequired && record.cardioDone ? 1 : 0)) /
      (requiredSets.length + (cardioRequired ? 1 : 0) || 1)) *
      100
  );
  const totalCompleted = progress.filter(p => p.completedAt).length,
    totalSessions = planTotalSessions(plan);
  const totalSets = progress.reduce(
    (sum, p) => sum + p.completedSets.length,
    0
  );
  const weekCompleted = progress.filter(
    p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
  ).length;
  const weeklyGoal = days.length;
  const pending =
    user && user.remindersEnabled && enrollment
      ? overdueDays(user, progress, plan)
      : [];
  const busy = saving || planLoading || loading;
  const changeLevel = async (next: Level) => {
    if (!account) return setGuestLevel(next);
    setSaving(true);
    try {
      await updatePlanPreferences({ level: next });
      toast.success("Nivel de Adelgazar actualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const persist = async (
    changes: Partial<
      Pick<Progress, "completedSets" | "cardioDone" | "warmupDone" | "setPerformance">
    >,
    message?: string
  ) => {
    if (!account) {
      navigate("/acceso?registro=1");
      return false;
    }
    const nextSets = changes.completedSets ?? record.completedSets;
    const reopensCompletedSession =
      record.completedAt &&
      (!requiredSets.every(id => nextSets.includes(id)) ||
        (cardioRequired && !(changes.cardioDone ?? record.cardioDone)));
    if (
      reopensCompletedSession &&
      !window.confirm(
        "Esta sesión ya está cumplida. ¿Quieres corregirla? Al desmarcar una serie o el cardio, su estrella se retirará hasta volver a completarla. Los demás registros no cambian."
      )
    )
      return false;
    setSaving(true);
    try {
      const next = await writeProgress(key, {
        completedSets: record.completedSets,
        cardioDone: record.cardioDone,
        warmupDone: record.warmupDone,
        setPerformance: record.setPerformance ?? [],
        ...changes,
      });
      if (next.completedAt && !record.completedAt)
        setCelebration("¡Rutina cumplida! Esta estrella es tuya.");
      else if (message) setCelebration(message);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const changeMark = (
    setKey: string,
    field: "weightKg" | "reps",
    value: string
  ) => {
    setMarkDrafts(current => ({
      ...current,
      [setKey]: {
        weightKg: current[setKey]?.weightKg ?? "",
        reps: current[setKey]?.reps ?? "",
        [field]: value,
      },
    }));
  };

  const saveExerciseMarks = (exercise: Exercise) => {
    const ids = Array.from(
      { length: exerciseSets(plan, exercise, level) },
      (_, index) => `${exercise.id}:${index + 1}`
    );
    const previous = (record.setPerformance ?? []).filter(
      item => !ids.includes(item.setKey)
    );
    const next: SetPerformance[] = [...previous];
    for (const setKey of ids) {
      const raw = markDrafts[setKey];
      const weightText = raw?.weightKg.trim() ?? "";
      const isTimed = Boolean(exercise.seconds || /segundos/i.test(exercise.reps ?? ""));
      const repsText = isTimed ? "" : (raw?.reps.trim() ?? "");
      if (!weightText && !repsText) continue;
      const weightKg = weightText ? Number(weightText) : null;
      const reps = repsText ? Number(repsText) : null;
      if (
        (weightKg !== null &&
          (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000 ||
            Math.abs(weightKg * 100 - Math.round(weightKg * 100)) > 0.000001)) ||
        (reps !== null && (!Number.isSafeInteger(reps) || reps < 1 || reps > 200))
      ) {
        toast.error("Usá pesos de 0 a 1000 kg (hasta dos decimales) y repeticiones de 1 a 200.");
        return;
      }
      next.push({ setKey, weightKg, reps });
    }
    void persist({ setPerformance: next }).then(saved => {
      if (saved) toast.success("Peso y repeticiones guardados.");
    });
  };

  const toggleSet = (exercise: Exercise, round: number) => {
    const id = `${exercise.id}:${round}`,
      adding = !record.completedSets.includes(id);
    const next = adding
      ? [...record.completedSets, id]
      : record.completedSets.filter(s => s !== id);
    const done = Array.from(
      { length: exerciseSets(plan, exercise, level) },
      (_, i) => `${exercise.id}:${i + 1}`
    ).every(s => next.includes(s));
    void persist(
      { completedSets: next },
      adding
        ? done
          ? "¡Ejercicio cumplido! Sigue a tu ritmo."
          : `¡Serie ${round} cumplida! Tu esfuerzo suma.`
        : undefined
    );
  };
  const toggleExercise = (exercise: Exercise) => {
    const ids = Array.from(
        { length: exerciseSets(plan, exercise, level) },
        (_, i) => `${exercise.id}:${i + 1}`
      ),
      done = ids.every(id => record.completedSets.includes(id));
    void persist(
      {
        completedSets: done
          ? record.completedSets.filter(id => !ids.includes(id))
          : Array.from(new Set([...record.completedSets, ...ids])),
      },
      done ? undefined : "¡Ejercicio cumplido! Un paso más."
    );
  };
  const start = () => {
    if (!account) return navigate("/acceso?registro=1");
    setTraining(true);
    document
      .getElementById("session-exercises")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const blocks = [...new Set(exercises.map(e => e.block))];
  return (
    <FitLayout>
      <section className="active-plan-strip">
        <Link href="/" className="text-link">
          ← Cambiar plan
        </Link>
        <span>
          <i />
          {plan.title} <small>· progreso independiente</small>
        </span>
        <Link href="/programa" className="text-link">
          Ver programa <ArrowRight size={13} />
        </Link>
      </section>
      <section className="page-intro">
        <div>
          <span className="eyebrow">
            CADA SESIÓN CUENTA · {plan.title.toUpperCase()}
          </span>
          <h1>
            {user
              ? `Vamos con todo, ${user.fullName.split(" ")[0]}.`
              : "Tu mejor versión empieza aquí."}
            <span className="intro-sparkle">
              <Sparkles size={25} />
            </span>
          </h1>
          <p>Un día a la vez. Un paso más cerca de tu objetivo.</p>
        </div>
        {plan.mode === "supersets" ? (
          <div className="level-picker">
            <span>MI NIVEL EN ESTE PLAN</span>
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
        ) : (
          <span className="tiny-pill">
            SERIES POR EJERCICIO · CANTIDADES DE TU PLAN
          </span>
        )}
      </section>
      <section className="metrics-row">
        <div className="metric">
          <span className="metric-icon blush">
            <Target size={20} />
          </span>
          <div>
            <span>{plan.continuous ? "Constancia de esta semana" : "Este plan completado"}</span>
            <strong>
              {totalCompleted}
              <small>
                {plan.continuous
                  ? " sesiones acumuladas"
                  : ` / ${totalSessions} sesiones`}
              </small>
            </strong>
          </div>
          <div className="mini-track">
            <i
              style={{
                width: `${Math.min(
                  100,
                  plan.continuous
                    ? (weekCompleted / (weeklyGoal || 1)) * 100
                    : (totalCompleted / (totalSessions || 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon peach">
            <Dumbbell size={20} />
          </span>
          <div>
            <span>Tu trabajo en {plan.title}</span>
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
      {!account && !loading && (
        <div className="guest-notice">
          <Sparkles size={16} />
          <span>
            Explora este plan. Crea una cuenta para guardar series y progreso.
          </span>
          <Link href="/acceso?registro=1">
            Crear mi espacio <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {planLoading && (
        <div className="loading-panel">
          Cargando el progreso de {plan.title}…
        </div>
      )}
      <div className="dashboard-columns">
        <div className="training-column">
          <section className="workout-hero">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="hero-white-pill">
                  {plan.title.toUpperCase()}
                </span>
                <span>
                  {plan.continuous
                    ? `SEMANA ${week} · PLAN CONTINUO`
                    : `SEMANA ${week} DE ${plan.weeks}`}
                </span>
              </div>
              <span className="hero-day">
                {isRest
                  ? "RECUPERACIÓN"
                  : `${routine!.label.toUpperCase()} · TU ENTRENAMIENTO`}
              </span>
              <h2>
                {isRest ? (
                  <>
                    Recuperar también
                    <br />
                    es avanzar.
                  </>
                ) : (
                  <>
                    {routine!.focus}.<br />
                    <em>Tu fuerza, tu camino.</em>
                  </>
                )}
              </h2>
              <p>
                {isRest
                  ? "No hay sesión programada para este día en tu plan."
                  : routine!.subtitle}
              </p>
              {!isRest && (
                <div className="hero-details">
                  <span>
                    <Dumbbell size={15} />
                    {exercises.length} ejercicios
                  </span>
                  <span>
                    <Clock3 size={15} />
                    {cardioRequired
                      ? `${config.cardioMinutes} min cardio`
                      : "Series por ejercicio"}
                  </span>
                </div>
              )}
              <button
                className="button hero-button"
                disabled={busy}
                onClick={isRest ? () => navigate("/programa") : start}
              >
                {isRest
                  ? "Ver mi semana"
                  : record.completedAt
                    ? "Revisar mi entrenamiento"
                    : training || completedCount
                      ? "Continuar entrenamiento"
                      : "Comenzar entrenamiento"}
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="hero-art">
              <div className="hero-ring ring-one" />
              <div className="hero-ring ring-two" />
              <div className="hero-emblem">
                <Dumbbell size={42} strokeWidth={1.35} />
              </div>
              <div className="hero-program-mark">
                {plan.continuous ? "∞" : plan.weeks}
                <span>
                  {plan.continuous ? "PLAN" : "SEMANAS"}
                  <br />
                  {plan.continuous ? "CONTINUO" : "DE SEGUIMIENTO"}
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
                    ? `${dateLabel(dayDate(user.startDate, week, 1), true)} — ${dateLabel(dayDate(user.startDate, week, 7), true)}`
                    : `${weeklyGoal} días con sesión · ${7 - weeklyGoal} sin sesión`}
                </p>
              </div>
              <select
                aria-label="Seleccionar semana"
                value={week}
                onChange={e => {
                  setWeek(Number(e.target.value));
                  setTraining(false);
                  setExerciseClock(null);
                }}
                className="week-select"
              >
                {planVisibleWeeks(
                  plan,
                  currentProgramDay(user, plan).week,
                  week
                ).map(w => (
                  <option key={w} value={w}>
                    Semana {w}
                  </option>
                ))}
              </select>
              {plan.continuous && (
                <div className="week-nav-controls" aria-label="Navegación por semanas">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={week <= 1}
                    onClick={() => {
                      setWeek(current => Math.max(1, current - 1));
                      setTraining(false);
                    }}
                  >
                    Semana anterior
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={week >= MAX_TRAINING_WEEK}
                    onClick={() => {
                      setWeek(current => Math.min(MAX_TRAINING_WEEK, current + 1));
                      setTraining(false);
                    }}
                  >
                    Semana siguiente
                  </button>
                </div>
              )}
            </div>
            <div className="day-selector">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                (label, index) => {
                  const target = days.find(d => d.day === index + 1),
                    done = progress.some(
                      p => p.dayKey === dayKey(week, index + 1) && p.completedAt
                    );
                  return (
                    <button
                      key={label}
                      className={`day-chip ${day === index + 1 ? "active" : ""} ${done ? "done" : ""} ${!target ? "rest-day" : ""}`}
                      onClick={() => {
                        setDay(index + 1);
                        setTraining(false);
                        setExerciseClock(null);
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
                        ) : (
                          (target?.focus.split(" y ")[0] ?? "Descanso")
                        )}
                      </small>
                    </button>
                  );
                }
              )}
            </div>
          </section>
          {!isRest ? (
            <section className="session-section" id="session-exercises">
              <div className="section-heading">
                <div>
                  <h2>Tu sesión de {routine!.label.toLowerCase()}</h2>
                  <p>
                    {plan.mode === "supersets"
                      ? `${config.reps} repeticiones · ${config.rounds} rondas por super serie`
                      : "Completa las series indicadas · las cantidades están en cada ficha"}
                  </p>
                  {savedRecord?.level &&
                    savedRecord.level !== selectedLevel && (
                      <small>Este registro conserva su nivel histórico.</small>
                    )}
                </div>
                <button
                  className="text-link guide-toggle"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <CircleHelp size={15} />
                  Cómo entrenar
                </button>
              </div>
              {showGuide && (
                <div className="guide-box">
                  <h3>
                    {plan.mode === "supersets"
                      ? `Así funciona tu nivel ${config.label.toLowerCase()}`
                      : isPersonalPlan
                        ? "Tu selección, a tu ritmo"
                        : "Las cantidades vienen de tus láminas"}
                  </h3>
                  {plan.mode === "supersets" ? (
                    <>
                      <p>
                        Haz los ejercicios de cada super serie uno tras otro.
                        Descansa al terminar el bloque y repite el recorrido{" "}
                        {config.rounds} veces. Termina con{" "}
                        {config.cardioMinutes} minutos de cardio.
                      </p>
                      <p className="source-note">
                        Las cantidades provienen de la tabla general del PDF. El
                        desplante fijo con salto de principiante indica 30
                        segundos por pierna. El sprint no especifica duración:
                        confirma la dosificación con tu profesional.
                      </p>
                    </>
                  ) : (
                    plan.notes.map((note, i) => (
                      <p className="source-note" key={i}>
                        {note}
                      </p>
                    ))
                  )}
                </div>
              )}
              <div className="warmup-bar">
                <div className="warmup-icon">
                  <Flame size={18} />
                </div>
                <div>
                  <strong>Primero, prepara tu cuerpo</strong>
                  <span>
                    {plan.mode === "supersets"
                      ? "El calentamiento es parte del proceso."
                      : "Sigue el calentamiento indicado por tu profesional."}
                  </span>
                </div>
                {plan.mode === "supersets" && (
                  <button
                    className="text-link"
                    onClick={() =>
                      setVideo({
                        name: "Calentamiento del programa",
                        videoUrl:
                          day === 2 || day === 4 ? WARMUP_UPPER : WARMUP_LOWER,
                        tips: "Prepara tu cuerpo antes de comenzar.",
                      })
                    }
                  >
                    <Play size={12} />
                    Ver
                  </button>
                )}
                <button
                  className={`small-check ${record.warmupDone ? "checked" : ""}`}
                  disabled={busy}
                  aria-label="Marcar o desmarcar calentamiento"
                  aria-pressed={record.warmupDone}
                  onClick={() =>
                    void persist({ warmupDone: !record.warmupDone })
                  }
                >
                  <Check size={14} />
                </button>
              </div>
              {!isPersonalPlan && routine!.sourceImage && (
                <a
                  href={routine!.sourceImage}
                  target="_blank"
                  rel="noreferrer"
                  className="source-sheet-link"
                >
                  <ImageIcon size={18} />
                  Ver la lámina original de {routine!.label.toLowerCase()}{" "}
                  <ArrowRight size={14} />
                </a>
              )}
              {blocks.map(block => (
                <section
                  className={`superset block-${block}`}
                  key={`${planId}-${key}-${block}`}
                >
                  <div className="superset-heading">
                    <div>
                      <span className="block-number">0{block}</span>
                      <div>
                        <h3>
                          {plan.mode === "supersets"
                            ? `Super serie ${block}`
                            : "Tus ejercicios, en orden"}
                        </h3>
                        <span>
                          {exercises.filter(e => e.block === block).length}{" "}
                          ejercicios ·{" "}
                          {plan.mode === "supersets"
                            ? `${config.rounds} rondas`
                            : "series indicadas en cada ejercicio"}
                        </span>
                      </div>
                    </div>
                    <span className="superset-tag">
                      {plan.mode === "supersets"
                        ? block === 1
                          ? "BASE"
                          : block === 2
                            ? "INTERMEDIO"
                            : "AVANZADO"
                        : isPersonalPlan
                          ? "TU SELECCIÓN"
                          : "LÁMINA ORIGINAL"}
                    </span>
                  </div>
                  <div className="exercise-list">
                    {exercises
                      .filter(e => e.block === block)
                      .map((e, index) => {
                        const ids = Array.from(
                            { length: exerciseSets(plan, e, level) },
                            (_, i) => `${e.id}:${i + 1}`
                          ),
                          done = ids.every(id =>
                            record.completedSets.includes(id)
                          );
                        const previousMarks = previousExerciseMarks(
                          e.id,
                          key,
                          enrollment?.startDate ?? user?.startDate ?? "",
                          progress,
                          archivedPlans
                        );
                        const reps =
                          plan.mode === "straight"
                            ? (e.reps ?? "Según ejercicio")
                            : level === "beginner" && e.id === "p22-e2"
                              ? "30 s por pierna"
                              : `${config.reps} repeticiones`;
                        return (
                          <article
                            className={`exercise-row ${done ? "completed" : ""} ${plan.mode === "straight" ? "illustrated-exercise" : ""}`}
                            key={e.id}
                          >
                            <button
                              type="button"
                              className="exercise-thumbnail"
                              aria-label={`Ver ${e.videoUrl ? "demostración" : "guía técnica"} de ${e.name}`}
                              onClick={() => setVideo(e)}
                            >
                              {e.thumbnail?.trim() ? (
                                <img src={e.thumbnail} alt="" loading="lazy"/>
                              ) : (
                                <div className="exercise-thumbnail-placeholder" aria-hidden="true">
                                  <Dumbbell size={24} strokeWidth={1.6} />
                                </div>
                              )}
                              <span>
                                {e.videoUrl || e.videoAlternative
                                  ? <Play size={14} fill="currentColor" />
                                  : e.sourceImage
                                    ? <ImageIcon size={16}/>
                                    : <Dumbbell size={15}/>}
                              </span>
                            </button>
                            <div className="exercise-copy">
                              <span className="exercise-order">
                                EJERCICIO {String(index + 1).padStart(2, "0")}
                              </span>
                              <button
                                type="button"
                                className="exercise-name"
                                onClick={() => setVideo(e)}
                              >
                                {e.name}
                              </button>
                              <span className="exercise-reps">{reps}</span>
                              {plan.mode === "straight" && (
                                <small className="exercise-source-tip">
                                  {e.tips}
                                </small>
                              )}
                              <button
                                type="button"
                                className="exercise-video-link"
                                onClick={() => setVideo(e)}
                              >
                                {e.videoUrl
                                  ? "Ver demostración"
                                  : e.sourceImage ? "Ver referencia" : "Ver guía técnica"}
                                <ArrowRight size={11} />
                              </button>
                              {e.seconds && (
                                <button
                                  className="text-link exercise-time-button"
                                  onClick={() => {
                                    setExerciseClock({
                                      seconds: e.seconds!,
                                      label: e.name,
                                    });
                                    document
                                      .getElementById("session-clock")
                                      ?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      });
                                  }}
                                >
                                  <Clock3 size={13} />
                                  Cronometrar {e.seconds} s
                                </button>
                              )}
                            </div>
                            <div className="exercise-controls">
                              <span className="sets-label">TUS SERIES</span>
                              <div className="set-buttons">
                                {ids.map((id, i) => (
                                  <button
                                    key={id}
                                    className={`set-button ${record.completedSets.includes(id) ? "checked" : ""}`}
                                    disabled={busy}
                                    aria-label={`${record.completedSets.includes(id) ? "Desmarcar" : "Completar"} serie ${i + 1} de ${e.name}`}
                                    aria-pressed={record.completedSets.includes(
                                      id
                                    )}
                                    onClick={() => toggleSet(e, i + 1)}
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
                                onClick={() => toggleExercise(e)}
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
                            <div className="exercise-measurements">
                              <div className="exercise-measurements-heading">
                                <strong>REGISTRÁ TU CARGA REAL</strong>
                                {previousMarks && (
                                  <span className="exercise-last-mark">
                                    Última vez ({dateLabel(previousMarks.date, true)}):{" "}
                                    {previousMarks.sets
                                      .map(item => `S${item.round}: ${formatSetMark(item.mark)}`)
                                      .join(" · ")}
                                  </span>
                                )}
                              </div>
                              <div className="exercise-measurements-grid">
                                {ids.map((setKey, index) => {
                                  const mark = markDrafts[setKey];
                                  return (
                                    <div className="exercise-mark-line" key={setKey}>
                                      <span>Serie {index + 1}</span>
                                      <label>
                                        <span>Peso (kg)</span>
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          min="0"
                                          max="1000"
                                          step="0.01"
                                          value={mark?.weightKg ?? ""}
                                          placeholder="—"
                                          disabled={busy || !account}
                                          aria-label={`Peso en kilogramos, serie ${index + 1} de ${e.name}`}
                                          onChange={event =>
                                            changeMark(setKey, "weightKg", event.target.value)
                                          }
                                        />
                                      </label>
                                      {!e.seconds && !/segundos/i.test(e.reps ?? "") ? (
                                        <label>
                                          <span>Reps reales</span>
                                          <input
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            max="200"
                                            step="1"
                                            value={mark?.reps ?? ""}
                                            placeholder="—"
                                            disabled={busy || !account}
                                            aria-label={`Repeticiones realizadas, serie ${index + 1} de ${e.name}`}
                                            onChange={event =>
                                              changeMark(setKey, "reps", event.target.value)
                                            }
                                          />
                                        </label>
                                      ) : (
                                        <small>Ejercicio cronometrado</small>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="exercise-measurements-footer">
                                <small>Opcional: guardar marcas no completa automáticamente las series.</small>
                                <button
                                  type="button"
                                  className="button secondary exercise-mark-save"
                                  disabled={busy || !account}
                                  onClick={() => saveExerciseMarks(e)}
                                >
                                  Guardar marcas
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                  <div className="superset-footer">
                    <Clock3 size={13} />
                    <span>
                      {plan.mode === "supersets"
                        ? "Al terminar el bloque"
                        : "Entre series/ejercicios"}
                      : reloj de descanso {Math.floor(restSeconds / 60)}:
                      {String(restSeconds % 60).padStart(2, "0")}.
                      {plan.mode === "straight"
                        ? isPersonalPlan
                          ? " Ajustable; opción de la app, no prescrita en tu selección."
                          : " Ajustable; no indicado en las fotos."
                        : " Toma agua."}
                    </span>
                  </div>
                </section>
              ))}
              {cardioRequired && (
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
                    <CheckCircle2 size={16} />
                    {record.cardioDone ? "Cardio realizado" : "Marcar cardio"}
                  </button>
                </div>
              )}
              <div className="session-bottom">
                <span>
                  {record.completedAt ? (
                    <>
                      <Star size={15} fill="currentColor" />
                      Tu estrella está guardada. ¡Sesión cumplida!
                    </>
                  ) : (
                    `${completedCount} de ${requiredSets.length} series realizadas. Se guarda al marcar.`
                  )}
                </span>
                {plan.mode === "supersets" && (
                  <button
                    className="text-link"
                    onClick={() =>
                      setVideo({
                        name: "Estiramiento del programa",
                        videoUrl: STRETCH,
                        tips: "Movimientos suaves y controlados; no fuerces el rango.",
                      })
                    }
                  >
                    Ver estiramiento <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="rest-panel">
              <span className="metric-icon lavender">
                <Sparkles size={25} />
              </span>
              <h2>Hoy, dale espacio a tu recuperación.</h2>
              <p>
                No hay ejercicios asignados para este día en {plan.title}. No se
                añaden sesiones para completar los huecos del material original.
              </p>
              <Link href="/programa" className="button secondary">
                Ver mi semana <ArrowRight size={16} />
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
                background: `conic-gradient(${plan.color} ${(weekCompleted / weeklyGoal) * 360}deg, color-mix(in srgb, ${plan.color} 16%, white) 0deg)`,
              }}
            >
              <div>
                <strong>
                  {weekCompleted}
                  <small>/{weeklyGoal}</small>
                </strong>
                <span>sesiones esta semana</span>
              </div>
            </div>
            <div className="weekly-stars">
              {Array.from({ length: weeklyGoal }, (_, i) => (
                <Star
                  key={i}
                  size={22}
                  fill={i < weekCompleted ? "currentColor" : "none"}
                  className={i < weekCompleted ? "earned" : ""}
                />
              ))}
            </div>
            <p>
              Cada estrella es una sesión de {plan.title} que hiciste por ti.
            </p>
            <Link href="/progreso" className="text-link">
              Ver mi progreso <ArrowRight size={14} />
            </Link>
          </section>
          {!isRest && (
            <section className="session-progress-card">
              <div>
                <span>AVANCE DE TU SESIÓN</span>
                <strong>{percent}%</strong>
              </div>
              <div className="session-track">
                <i style={{ width: `${percent}%` }} />
              </div>
              <p>
                {record.completedAt
                  ? "¡Lo hiciste! Tu progreso está guardado."
                  : `${completedCount}/${requiredSets.length} series${cardioRequired ? ` · cardio ${record.cardioDone ? "realizado" : "pendiente"}` : ""}`}
              </p>
            </section>
          )}
          <div id="session-clock">
            <TimerCard
              key={`${planId}-${key}`}
              restSeconds={restSeconds}
              cardioMinutes={config.cardioMinutes}
              exerciseSeconds={exerciseClock?.seconds}
              exerciseLabel={exerciseClock?.label}
              onCardioComplete={() => {
                if (!record.cardioDone)
                  void persist({ cardioDone: true }, "¡Cardio cumplido!");
              }}
            />
            {plan.mode === "straight" && (
              <label className="rest-duration-picker">
                Descanso de este plan
                <select
                  aria-label="Duración del descanso"
                  value={restSeconds}
                  disabled={busy || !account}
                  onChange={async e => {
                    try {
                      await updatePlanPreferences({
                        restSeconds: Number(e.target.value),
                      });
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  {Array.from(new Set([30, 45, 60, 90, 120, 180, restSeconds]))
                    .sort((a, b) => a - b)
                    .map(s => (
                      <option key={s} value={s}>
                        {s} segundos
                      </option>
                    ))}
                </select>
                <small>Opción de la app, no prescrita en las fotos.</small>
              </label>
            )}
          </div>
          <section
            className={`reminder-card ${pending.length ? "overdue" : ""}`}
          >
            <BellRing size={20} />
            <h3>
              {pending.length ? "Tu rutina te espera" : "Haz espacio para ti"}
            </h3>
            <p>
              {pending.length
                ? `Tienes ${pending.length} sesiones pendientes en ${plan.title}. Retoma con calma; no acumules entrenamientos para compensar.`
                : user
                  ? `Recordatorio de ${plan.title} a las ${user.reminderTime}. Se muestra aquí al abrir la app.`
                  : "Inicia sesión para guardar tu horario y ver pendientes."}
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
