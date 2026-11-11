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
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import {
  EXERCISE_MUSCLE_GROUPS,
  personalPlanDraftFromPlan,
  type ExerciseLibraryItem,
  type PersonalDaySelection,
  type PersonalPlanDraft,
} from "@shared/exercise-library";
import type { TrainingPlan } from "@shared/programs";
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
const EMPTY_DRAFT: PersonalPlanDraft = { days: [] };
const EXERCISES_BY_ID = new Map(
  EXERCISE_MUSCLE_GROUPS.flatMap(group =>
    group.exercises.map(exercise => [exercise.id, exercise] as const)
  )
);

type PersonalPlanResponse = {
  plan: TrainingPlan | null;
  editable: boolean;
};

export default function PersonalPlanBuilder() {
  const { savePersonalPlan, selectPlan } = useFit();
  const [, navigate] = useLocation();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [editable, setEditable] = useState(true);
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

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const result = await api<PersonalPlanResponse>("/personal-plan");
      setPlan(result.plan);
      setEditable(Boolean(result.editable));
      if (result.plan) {
        const hydrated = personalPlanDraftFromPlan(result.plan);
        setDraft(hydrated);
        setSelectedDay(hydrated.days[0]?.day ?? 1);
      } else {
        setDraft({ days: [] });
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
          days: currentDraft.days.map(day =>
            day.day === selectedDay
              ? { ...day, exercises: [...day.exercises, nextExercise] }
              : day
          ),
        };
      }
      return {
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

    setSaving(true);
    try {
      await savePersonalPlan(draft, Boolean(plan));
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

  const openTraining = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await selectPlan(plan.id);
      navigate("/entrenamiento");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo abrir tu Plan Personal."
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
                <Clock3 size={16} /> 4 semanas de seguimiento
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
        ) : plan && !editable ? (
          <ProtectedPlanView
            plan={plan}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            opening={saving}
            onOpenTraining={() => void openTraining()}
          />
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
                                <span className="pp-no-demo">
                                  Sin video ni lámina específica
                                </span>
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

function ProtectedPlanView({
  plan,
  selectedDay,
  onSelectDay,
  onOpenTraining,
  opening,
}: {
  plan: TrainingPlan;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onOpenTraining: () => void;
  opening: boolean;
}) {
  const days = plan.routine.first;
  const activeDay = days.find(day => day.day === selectedDay) ?? days[0];
  return (
    <section className="pp-protected-view">
      <div className="pp-protected-banner">
        <span className="pp-protected-icon">
          <ShieldCheck size={22} />
        </span>
        <div>
          <span className="pp-eyebrow">ESTRUCTURA PROTEGIDA</span>
          <h2>Tu historial cuida esta rutina.</h2>
          <p>
            Ya hay progreso asociado a tu Plan Personal. Para proteger tus
            registros, no se pueden cambiar los días, ejercicios, el orden ni
            las cantidades. Sí podés abrirlo y seguir entrenando.
          </p>
        </div>
        <button
          className="button pp-save-button pp-open-plan"
          onClick={onOpenTraining}
          disabled={opening}
        >
          {opening ? "Abriendo…" : "Abrir Plan Personal"}{" "}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="pp-protected-days">
        <div className="pp-panel-heading">
          <div>
            <span className="pp-eyebrow">VISTA DE TU RUTINA</span>
            <h3>Plan Personal</h3>
          </div>
          <span className="pp-private-badge">
            <LockKeyhole size={14} /> Privado
          </span>
        </div>
        <div
          className="pp-week-picker"
          role="group"
          aria-label="Días de tu Plan Personal"
        >
          {WEEKDAYS.map((label, index) => {
            const dayNumber = index + 1;
            const day = days.find(item => item.day === dayNumber);
            return (
              <button
                key={dayNumber}
                className={`pp-day-tab ${selectedDay === dayNumber ? "is-selected" : ""} ${day ? "has-exercises" : ""}`}
                type="button"
                aria-pressed={selectedDay === dayNumber}
                onClick={() => day && onSelectDay(dayNumber)}
                disabled={!day}
              >
                <span>{label.slice(0, 2)}</span>
                <strong>{label}</strong>
                <small>
                  {day
                    ? `${day.exercises.length} ${day.exercises.length === 1 ? "ejercicio" : "ejercicios"}`
                    : "Libre"}
                </small>
              </button>
            );
          })}
        </div>
        {activeDay ? (
          <div className="pp-protected-exercises">
            <span className="pp-eyebrow">{activeDay.focus}</span>
            <h3>{activeDay.label}</h3>
            <ol>
              {activeDay.exercises.map((exercise, index) => (
                <li key={exercise.id}>
                  <span className="pp-protected-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{exercise.name}</strong>
                    <p>{exercise.tips}</p>
                  </div>
                  <span className="pp-protected-dose">
                    {exercise.sets ?? 3} ×{" "}
                    {exercise.seconds
                      ? `${exercise.seconds} s`
                      : (exercise.reps ?? "10 repeticiones")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="pp-panel-hint">Este día queda libre en tu plan.</p>
        )}
        <div className="pp-protected-footnote">
          <LockKeyhole size={15} /> No se comparte con otras cuentas.
          Administración puede consultar tu seguimiento.
        </div>
      </div>
    </section>
  );
}
