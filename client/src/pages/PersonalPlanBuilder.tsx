import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  Info,
  LockKeyhole,
  Plus,
  Play,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { VideoModal } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import {
  EXERCISE_MUSCLE_GROUPS,
  personalPlanDraftFromPlan,
  type PersonalPlanDuration,
  type ExerciseLibraryItem,
  type PersonalDaySelection,
  type PersonalPlanDraft,
} from "@shared/exercise-library";
import type { TrainingPlan } from "@shared/programs";
import type { Exercise } from "@shared/routine";
import { withPersonalDemo, type PersonalExerciseMedia } from "@shared/personal-exercise-media";
import "../personal-plan.css";

const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const EMPTY_DRAFT: PersonalPlanDraft = { days: [], duration: 4 };
const EXERCISES_BY_ID = new Map(
  EXERCISE_MUSCLE_GROUPS.flatMap(group =>
    group.exercises.map(exercise => [exercise.id, exercise] as const)
  )
);

type PersonalPlanResponse = {
  plan: TrainingPlan | null;
  editable: boolean;
  hasProgress: boolean;
  version: number;
};

export default function PersonalPlanBuilder() {
  const { savePersonalPlan, selectPlan } = useFit();
  const [, navigate] = useLocation();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [draft, setDraft] = useState<PersonalPlanDraft>(EMPTY_DRAFT);
  const [selectedDay, setSelectedDay] = useState(1);
  const [openGroup, setOpenGroup] = useState<string | null>(
    EXERCISE_MUSCLE_GROUPS[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<PersonalExerciseMedia[]>([]);
  const [preview, setPreview] = useState<Pick<
    Exercise, "name" | "videoUrl" | "tips" | "videoAlternative" | "sourceImage" | "demoCredit" | "demoGuide"
  > | null>(null);

  useEffect(() => {
    let active = true;
    void api<{ media: PersonalExerciseMedia[] }>("/personal-exercises/media")
      .then(data => { if (active) setMedia(data.media); })
      .catch(() => { if (active) setMedia([]); });
    return () => { active = false; };
  }, []);

  const previewExercise = (item: ExerciseLibraryItem) => {
    const exercise: Exercise = {
      id: `pp-d1-${item.id}`,
      name: item.name,
      videoUrl: "",
      thumbnail: "",
      block: 1,
      tips: item.tips,
    };
    setPreview(withPersonalDemo(exercise, media));
  };
  const hasDemo = (exerciseId: string) =>
    media.some(entry => entry.exerciseId === exerciseId && entry.videoUrl);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const result = await api<PersonalPlanResponse>("/personal-plan");
      setPlan(result.plan);
      setHasProgress(Boolean(result.hasProgress));
      if (result.plan) {
        const hydrated = personalPlanDraftFromPlan(result.plan);
        setDraft(hydrated);
        setSelectedDay(hydrated.days[0]?.day ?? 1);
      } else {
        setDraft({ days: [], duration: 4 });
        setSelectedDay(1);
      }
    } catch (error) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar tu Plan Personal."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const selectedDayDraft = draft.days.find(day => day.day === selectedDay);
  const selectedExercises = selectedDayDraft?.exercises ?? [];
  const matchingGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return EXERCISE_MUSCLE_GROUPS;
    return EXERCISE_MUSCLE_GROUPS.map(group => ({
      ...group,
      exercises: group.exercises.filter(exercise =>
        `${exercise.name} ${group.name} ${exercise.tips}`
          .toLocaleLowerCase("es")
          .includes(query)
      ),
    })).filter(group => group.exercises.length > 0);
  }, [search]);

  const updateSelectedDay = (
    update: (day: PersonalDaySelection) => PersonalDaySelection
  ) => {
    setDraft(current => ({
      ...current,
      days: current.days.map(day =>
        day.day === selectedDay ? update(day) : day
      ),
    }));
    setFormError(null);
  };

  const addExercise = (item: ExerciseLibraryItem) => {
    const nextExercise = {
      exerciseId: item.id,
      sets: 3,
      target: item.defaultTarget,
    };
    setDraft(currentDraft => {
      const existingDay = currentDraft.days.find(
        day => day.day === selectedDay
      );
      if (existingDay) {
        if (
          existingDay.exercises.some(
            exercise => exercise.exerciseId === item.id
          ) ||
          existingDay.exercises.length >= 20
        )
          return currentDraft;
        return {
          ...currentDraft,
          days: currentDraft.days.map(day =>
            day.day === selectedDay
              ? { ...day, exercises: [...day.exercises, nextExercise] }
              : day
          ),
        };
      }
      return {
        ...currentDraft,
        days: [
          ...currentDraft.days,
          { day: selectedDay, exercises: [nextExercise] },
        ].sort((a, b) => a.day - b.day),
      };
    });
    setFormError(null);
  };

  const removeExercise = (exerciseId: string) => {
    const current = draft.days.find(day => day.day === selectedDay);
    if (!current) return;
    if (current.exercises.length === 1) {
      setDraft(value => ({
        ...value,
        days: value.days.filter(day => day.day !== selectedDay),
      }));
      setFormError(null);
      return;
    }
    updateSelectedDay(day => ({
      ...day,
      exercises: day.exercises.filter(
        exercise => exercise.exerciseId !== exerciseId
      ),
    }));
  };

  const moveExercise = (exerciseId: string, offset: -1 | 1) => {
    updateSelectedDay(day => {
      const index = day.exercises.findIndex(
        exercise => exercise.exerciseId === exerciseId
      );
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= day.exercises.length)
        return day;
      const exercises = [...day.exercises];
      [exercises[index], exercises[destination]] = [
        exercises[destination],
        exercises[index],
      ];
      return { ...day, exercises };
    });
  };

  const updateExercise = (
    exerciseId: string,
    patch: Partial<PersonalDaySelection["exercises"][number]>
  ) => {
    updateSelectedDay(day => ({
      ...day,
      exercises: day.exercises.map(exercise =>
        exercise.exerciseId === exerciseId
          ? { ...exercise, ...patch }
          : exercise
      ),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (draft.days.length < 1) {
      setFormError(
        "Sumá ejercicios a por lo menos un día para guardar tu plan."
      );
      return;
    }
    if (
      draft.days.some(
        day => day.exercises.length < 1 || day.exercises.length > 20
      )
    ) {
      setFormError("Cada día debe tener entre 1 y 20 ejercicios.");
      return;
    }
    const duplicate = draft.days.some(
      day =>
        new Set(day.exercises.map(exercise => exercise.exerciseId)).size !==
        day.exercises.length
    );
    if (duplicate) {
      setFormError("No repitas el mismo ejercicio dentro de un día.");
      return;
    }

    const changed = plan
      ? JSON.stringify(draft) !==
        JSON.stringify(personalPlanDraftFromPlan(plan))
      : true;
    if (plan && hasProgress && changed) {
      const confirmed = window.confirm(
        "Se guardará una copia de tu rutina actual con todas sus sesiones y series. " +
          "La nueva versión empezará un ciclo de entrenamiento desde el próximo lunes. " +
          "Podrás consultar las versiones anteriores en Mi progreso. ¿Continuar?"
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      await savePersonalPlan(draft, Boolean(plan), plan);
      navigate("/entrenamiento");
      toast.success(
        plan
          ? "Tu Plan Personal quedó actualizado. ¡A entrenar!"
          : "Tu Plan Personal ya está listo. ¡A entrenar!"
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar tu Plan Personal."
      );
    } finally {
      setSaving(false);
    }
  };


  return (
    <FitLayout title="Plan Personal">
      <main className="personal-plan-page">
        <Link className="pp-back-link" href="/planes">
          <ArrowLeft size={16} /> Volver a Mis planes
        </Link>
        <header className="pp-hero">
          <div className="pp-hero-copy">
            <span className="pp-eyebrow">TU SEMANA, A TU MANERA</span>
            <h1>
              Diseñá tu <span>Plan Personal.</span>
            </h1>
            <p>
              Elegí los días, combiná ejercicios por grupo muscular y ajustá las
              series a tu ritmo. Lo que armes queda asociado a tu cuenta.
            </p>
            <div className="pp-hero-facts">
              <span>
                <CalendarDays size={16} /> Lunes a domingo
              </span>
              <span>
                <Clock3 size={16} />{" "}
                {draft.duration === "continuous"
                  ? "Entrenamiento continuo"
                  : `${draft.duration ?? 4} semanas de seguimiento`}
              </span>
              <span className="pp-color-mark">TEAL · TU SELECCIÓN</span>
            </div>
          </div>
          <div className="pp-hero-image">
            <img
              src="/exercises/program-banner.png"
              alt="Portada compartida de los programas de Ritmo Fit"
            />
            <span>Plan Personal</span>
          </div>
        </header>

        {loading ? (
          <div className="pp-state-card" role="status">
            <span className="pp-spinner" />
            <p>Buscando tu Plan Personal…</p>
          </div>
        ) : loadingError ? (
          <div className="pp-state-card pp-state-error" role="alert">
            <p>{loadingError}</p>
            <button
              className="button secondary"
              onClick={() => void loadPlan()}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <form className="pp-builder-form" onSubmit={submit}>
            <div className="pp-form-heading">
              <div>
                <span className="pp-eyebrow">
                  {plan ? "TU RUTINA ACTUAL" : "EMPEZÁ POR TU SEMANA"}
                </span>
                <h2>{plan ? "Ajustá tu selección" : "Armá tu semana"}</h2>
                <p>
                  Elegí un día para ver ejercicios disponibles y sumarlos a tu
                  rutina. Podés ordenar cada jornada como prefieras.
                </p>
              </div>
              {plan && (
                <span className="pp-private-badge">
                  <LockKeyhole size={14} /> Solo vos
                </span>
              )}
            </div>

            <section className="pp-duration" aria-label="Duración de tu Plan Personal">
              <div className="pp-panel-heading">
                <div>
                  <span className="pp-eyebrow">DURACIÓN DEL PLAN</span>
                  <h3>¿Por cuánto tiempo querés seguir esta rutina?</h3>
                  <p>Podés cambiarla más adelante conservando el historial anterior.</p>
                </div>
              </div>
              <div className="pp-duration-options" role="group" aria-label="Elegí la duración">
                {([
                  { value: 4, title: "4 semanas" },
                  { value: 8, title: "8 semanas" },
                  { value: 12, title: "12 semanas" },
                  { value: "continuous", title: "Sin fecha de fin" },
                ] as const).map(option => (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={`pp-duration-option ${(draft.duration ?? 4) === option.value ? "is-selected" : ""}`}
                    aria-pressed={(draft.duration ?? 4) === option.value}
                    onClick={() =>
                      setDraft(current => ({
                        ...current,
                        duration: option.value as PersonalPlanDuration,
                      }))
                    }
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              {draft.duration === "continuous" && (
                <p className="pp-panel-hint">
                  Tu semana se repite y cada entrenamiento conserva su fecha y
                  progreso. El programa no finaliza automáticamente.
                </p>
              )}
            </section>

            <div
              className="pp-week-picker"
              role="group"
              aria-label="Días de la semana"
            >
              {WEEKDAYS.map((label, index) => {
                const dayNumber = index + 1;
                const count =
                  draft.days.find(day => day.day === dayNumber)?.exercises
                    .length ?? 0;
                return (
                  <button
                    key={dayNumber}
                    className={`pp-day-tab ${selectedDay === dayNumber ? "is-selected" : ""} ${count ? "has-exercises" : ""}`}
                    type="button"
                    aria-pressed={selectedDay === dayNumber}
                    onClick={() => setSelectedDay(dayNumber)}
                  >
                    <span>{label.slice(0, 2)}</span>
                    <strong>{label}</strong>
                    <small>
                      {count
                        ? `${count} ${count === 1 ? "ejercicio" : "ejercicios"}`
                        : "Libre"}
                    </small>
                  </button>
                );
              })}
            </div>

            <div className="pp-workspace">
              <section
                className="pp-selected-panel"
                aria-labelledby="pp-selected-title"
              >
                <div className="pp-panel-heading">
                  <div>
                    <span className="pp-eyebrow">DÍA {selectedDay}</span>
                    <h3 id="pp-selected-title">{WEEKDAYS[selectedDay - 1]}</h3>
                  </div>
                  <span className="pp-count-pill">
                    {selectedExercises.length}/20
                  </span>
                </div>
                <p className="pp-panel-hint">
                  Sumá de 1 a 20 ejercicios. El orden de esta lista será el de
                  tu entrenamiento.
                </p>
                {selectedExercises.length ? (
                  <ol className="pp-selected-list">
                    {selectedExercises.map((selection, index) => {
                      const item = EXERCISES_BY_ID.get(selection.exerciseId);
                      if (!item) return null;
                      const unitName =
                        item.unit === "segundos" ? "segundos" : "repeticiones";
                      return (
                        <li
                          className="pp-selected-item"
                          key={`${selectedDay}-${selection.exerciseId}`}
                        >
                          <div
                            className="pp-exercise-order"
                            aria-label={`Ejercicio ${index + 1}`}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="pp-selected-content">
                            <div className="pp-selected-title-row">
                              <div>
                                <h4>{item.name}</h4>
                                <p>{item.tips}</p>
                                <button
                                  type="button"
                                  className="pp-demo-link"
                                  onClick={() => previewExercise(item)}
                                >
                                  <Play size={14} />
                                  {hasDemo(item.id) ? "Ver demostración" : "Ver guía técnica"}
                                </button>
                              </div>
                              <button
                                className="pp-icon-button pp-remove-button"
                                type="button"
                                aria-label={`Quitar ${item.name}`}
                                onClick={() => removeExercise(item.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="pp-dose-controls">
                              <label>
                                <span>Series</span>
                                <select
                                  value={selection.sets}
                                  aria-label={`Series de ${item.name}`}
                                  onChange={event =>
                                    updateExercise(item.id, {
                                      sets: Number(event.currentTarget.value),
                                    })
                                  }
                                >
                                  {Array.from(
                                    { length: 10 },
                                    (_, n) => n + 1
                                  ).map(value => (
                                    <option key={value} value={value}>
                                      {value}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="pp-target-field">
                                <span>
                                  {item.unit === "segundos"
                                    ? "Duración"
                                    : "Repeticiones"}
                                </span>
                                <NumericField
                                  value={selection.target}
                                  min={1}
                                  max={item.unit === "segundos" ? 3600 : 100}
                                  unit={item.unit === "segundos" ? "s" : "reps"}
                                  label={`${unitName} de ${item.name}`}
                                  onChange={value =>
                                    updateExercise(item.id, { target: value })
                                  }
                                />
                              </label>
                              <div
                                className="pp-reorder-controls"
                                aria-label={`Orden de ${item.name}`}
                              >
                                <button
                                  className="pp-icon-button"
                                  type="button"
                                  aria-label={`Subir ${item.name}`}
                                  disabled={index === 0}
                                  onClick={() => moveExercise(item.id, -1)}
                                >
                                  <ChevronUp size={17} />
                                </button>
                                <button
                                  className="pp-icon-button"
                                  type="button"
                                  aria-label={`Bajar ${item.name}`}
                                  disabled={
                                    index === selectedExercises.length - 1
                                  }
                                  onClick={() => moveExercise(item.id, 1)}
                                >
                                  <ChevronDown size={17} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="pp-empty-day">
                    <span className="pp-empty-icon">
                      <Dumbbell size={23} />
                    </span>
                    <strong>Un día libre… por ahora.</strong>
                    <p>Explorá los grupos y agregá tu primer ejercicio.</p>
                  </div>
                )}
              </section>

              <section
                className="pp-library-panel"
                aria-labelledby="pp-library-title"
              >
                <div className="pp-panel-heading">
                  <div>
                    <span className="pp-eyebrow">CATÁLOGO COMPARTIDO</span>
                    <h3 id="pp-library-title">Elegí un ejercicio</h3>
                  </div>
                  <span className="pp-library-icon">
                    <Dumbbell size={19} />
                  </span>
                </div>
                <label className="pp-search">
                  <Search size={17} />
                  <span className="sr-only">
                    Buscar ejercicio o grupo muscular
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.currentTarget.value)}
                    placeholder="Buscar ejercicio o grupo…"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <p className="pp-panel-hint">
                  Tocá un grupo para ver sus opciones. No se agregan ejercicios
                  duplicados al mismo día.
                </p>
                <div className="pp-groups-list">
                  {matchingGroups.map(group => {
                    const isOpen = Boolean(search) || openGroup === group.id;
                    return (
                      <section className="pp-muscle-group" key={group.id}>
                        <button
                          className="pp-muscle-heading"
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenGroup(current =>
                              current === group.id ? null : group.id
                            )
                          }
                        >
                          <span>{group.name}</span>
                          <small>{group.exercises.length}</small>
                          <ChevronDown size={17} />
                        </button>
                        {isOpen && (
                          <div className="pp-catalog-exercises">
                            {group.exercises.map(item => {
                              const alreadyAdded = selectedExercises.some(
                                exercise => exercise.exerciseId === item.id
                              );
                              const maxReached = selectedExercises.length >= 20;
                              return (
                                <article
                                  className="pp-catalog-item"
                                  key={item.id}
                                >
                                  <div>
                                    <h4>{item.name}</h4>
                                    <p>{item.tips}</p>
                                    <small>
                                      {item.unit === "segundos"
                                        ? `${item.defaultTarget} segundos iniciales`
                                        : `${item.defaultTarget} repeticiones iniciales`}
                                    </small>
                                    <button
                                      type="button"
                                      className="pp-demo-link"
                                      onClick={() => previewExercise(item)}
                                    >
                                      <Play size={13} />
                                      {hasDemo(item.id) ? "Ver video" : "Guía técnica"}
                                    </button>
                                  </div>
                                  <button
                                    className={`pp-add-button ${alreadyAdded ? "is-added" : ""}`}
                                    type="button"
                                    disabled={alreadyAdded || maxReached}
                                    aria-label={
                                      alreadyAdded
                                        ? `${item.name} ya está agregado`
                                        : `Agregar ${item.name}`
                                    }
                                    onClick={() => addExercise(item)}
                                  >
                                    {alreadyAdded ? (
                                      <Check size={17} />
                                    ) : (
                                      <Plus size={18} />
                                    )}
                                    <span>
                                      {alreadyAdded
                                        ? "Agregado"
                                        : maxReached
                                          ? "Máximo"
                                          : "Sumar"}
                                    </span>
                                  </button>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                  {!matchingGroups.length && (
                    <div className="pp-no-results">
                      No encontramos ejercicios con esa búsqueda. Probá con otro
                      nombre o grupo.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {plan && hasProgress && (
              <div className="pp-safety-note" role="note">
                <ShieldCheck size={18} />
                <p>
                  <strong>Podés editar tu rutina sin perder el historial.</strong>{" "}
                  Si guardás cambios, se archiva la versión anterior con todas
                  sus sesiones y fechas. La nueva versión empieza un ciclo
                  independiente; consultá las anteriores en{" "}
                  <Link href="/progreso">Mi progreso</Link>.
                </p>
              </div>
            )}
            <div className="pp-safety-note">
              <Info size={17} />
              <p>
                Elegí una carga que puedas controlar y frená si sentís dolor. El
                plan organiza tu selección; no reemplaza una evaluación
                profesional. Los ejercicios propios se muestran sin demos
                inventadas.
              </p>
            </div>
            {formError && (
              <div className="pp-form-error" role="alert">
                <Info size={17} /> {formError}
              </div>
            )}
            <div className="pp-save-bar">
              <span>
                {draft.days.length
                  ? `${draft.days.length} ${draft.days.length === 1 ? "día armado" : "días armados"}`
                  : "Elegí al menos un día para empezar"}
              </span>
              <button
                className="button pp-save-button"
                type="submit"
                disabled={saving || !draft.days.length}
              >
                {saving
                  ? "Guardando…"
                  : plan
                    ? "Guardar cambios"
                    : "Crear Plan Personal"}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        )}
      </main>
      <VideoModal exercise={preview} onClose={() => setPreview(null)} />
    </FitLayout>
  );
}

function NumericField({
  value,
  min,
  max,
  unit,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <span className="pp-number-control">
      <input
        type="number"
        required
        min={min}
        max={max}
        step={1}
        value={text}
        aria-label={label}
        onChange={event => {
          const nextText = event.currentTarget.value;
          setText(nextText);
          if (!nextText) return;
          const next = Number(nextText);
          if (Number.isSafeInteger(next) && next >= min && next <= max)
            onChange(next);
        }}
        onBlur={() => {
          const next = Number(text);
          if (!Number.isSafeInteger(next) || next < min || next > max) {
            setText(String(value));
            return;
          }
          onChange(next);
        }}
      />
      <span>{unit}</span>
    </span>
  );
}

