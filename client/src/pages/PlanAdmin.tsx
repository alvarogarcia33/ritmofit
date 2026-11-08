import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  Copy,
  FilePenLine,
  ImagePlus,
  Info,
  Library,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import { validateEditablePlan } from "@/lib/plan-editor";
import { LEGACY_PLAN_ID, type TrainingPlan } from "@shared/programs";
import type { Exercise, RoutineDay } from "@shared/routine";
import "../admin.css";
import "../plan-admin.css";

const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

type ExerciseDraft = {
  id: string;
  name: string;
  tips: string;
  sets: string;
  reps: string;
  seconds: string;
  duration45: boolean;
  videoUrl: string;
  thumbnail: string;
  sourceImage: string;
};

type PlanField = keyof Pick<
  TrainingPlan,
  | "title"
  | "subtitle"
  | "description"
  | "color"
  | "coverImage"
  | "weeks"
  | "restSeconds"
  | "sourceLabel"
  | "sourceUrl"
  | "notes"
>;

export default function PlanAdmin() {
  const { user, loading } = useFit();

  return (
    <FitLayout title="Biblioteca admin">
      {loading ? (
        <PlanAdminLoading />
      ) : !user ? (
        <AdminGate mode="login" />
      ) : user.role !== "admin" ? (
        <AdminGate mode="restricted" />
      ) : (
        <PlanAdminWorkspace />
      )}
    </FitLayout>
  );
}

function PlanAdminWorkspace() {
  const { refreshPlans } = useFit();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TrainingPlan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null
  );
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ plans: TrainingPlan[] }>("/admin/plans");
      setPlans(result.plans);
      setForm(current => {
        if (!current)
          return result.plans[0] ? clonePlan(result.plans[0]) : null;
        const refreshed = result.plans.find(item => item.id === current.id);
        return refreshed ? clonePlan(refreshed) : current;
      });
      setSelectedDayNumber(result.plans[0]?.routine.first[0]?.day ?? 1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la biblioteca de planes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const selectedDay = useMemo(
    () =>
      form?.routine.first.find(item => item.day === selectedDayNumber) ?? null,
    [form, selectedDayNumber]
  );
  const existingDayNumbers = useMemo(
    () => new Set(form?.routine.first.map(item => item.day) ?? []),
    [form]
  );
  const isLegacy = form?.id === LEGACY_PLAN_ID;
  const isStructureEditable = Boolean(form && !isLegacy);

  const openPlan = (plan: TrainingPlan) => {
    const next = clonePlan(plan);
    setForm(next);
    setIsNew(false);
    setSelectedDayNumber(next.routine.first[0]?.day ?? 1);
    setEditingExerciseId(null);
    setExerciseDraft(null);
    setFormError(null);
    setSavedAt(null);
  };

  const startDraft = () => {
    const next = createEmptyPlan();
    setForm(next);
    setIsNew(true);
    setSelectedDayNumber(1);
    setEditingExerciseId(null);
    setExerciseDraft(null);
    setFormError(null);
    setSavedAt(null);
  };

  const updateField = (
    field: PlanField,
    value: string | number | string[] | undefined
  ) => {
    setForm(current => (current ? { ...current, [field]: value } : current));
    setSavedAt(null);
    setFormError(null);
  };

  const addDay = (dayNumber = selectedDayNumber) => {
    if (!form || isLegacy || existingDayNumbers.has(dayNumber)) return;
    const day = createDay(dayNumber);
    setForm(current =>
      current
        ? {
            ...current,
            routine: {
              first: [...current.routine.first, day].sort(
                (a, b) => a.day - b.day
              ),
              second: [...current.routine.second, cloneDay(day)].sort(
                (a, b) => a.day - b.day
              ),
            },
          }
        : current
    );
    setSelectedDayNumber(dayNumber);
    setEditingExerciseId(null);
    setExerciseDraft(null);
    setSavedAt(null);
    setFormError(null);
  };

  const updateDay = (patch: Partial<RoutineDay>) => {
    if (!form || !isStructureEditable) return;
    setForm(current => {
      if (!current) return current;
      const update = (day: RoutineDay) =>
        day.day === selectedDayNumber ? { ...day, ...patch } : day;
      return {
        ...current,
        routine: {
          first: current.routine.first.map(update),
          second: current.routine.second.map(update),
        },
      };
    });
    setSavedAt(null);
    setFormError(null);
  };

  const removeDay = () => {
    if (!form || !isStructureEditable || !selectedDay) return;
    setForm(current =>
      current
        ? {
            ...current,
            routine: {
              first: current.routine.first.filter(
                item => item.day !== selectedDayNumber
              ),
              second: current.routine.second.filter(
                item => item.day !== selectedDayNumber
              ),
            },
          }
        : current
    );
    const fallback =
      form.routine.first.find(item => item.day !== selectedDayNumber)?.day ?? 1;
    setSelectedDayNumber(fallback);
    setEditingExerciseId(null);
    setExerciseDraft(null);
    setSavedAt(null);
  };

  const createExerciseDraft = () => {
    if (!form || !selectedDay || !isStructureEditable) return;
    const id = nextExerciseId(
      form.id,
      selectedDayNumber,
      selectedDay.exercises
    );
    setEditingExerciseId(null);
    setExerciseDraft({
      id,
      name: "",
      tips: "",
      sets: "3",
      reps: "",
      seconds: "",
      duration45: false,
      videoUrl: "",
      thumbnail: "",
      sourceImage: "",
    });
    setFormError(null);
  };

  const editExercise = (exercise: Exercise) => {
    if (!isStructureEditable) return;
    setEditingExerciseId(exercise.id);
    setExerciseDraft({
      id: exercise.id,
      name: exercise.name,
      tips: exercise.tips,
      sets: String(exercise.sets ?? 3),
      reps: exercise.reps ?? "",
      seconds: exercise.seconds ? String(exercise.seconds) : "",
      duration45: exercise.seconds === 45,
      videoUrl: exercise.videoUrl,
      thumbnail: exercise.thumbnail,
      sourceImage: exercise.sourceImage ?? "",
    });
    setFormError(null);
  };

  const saveExercise = () => {
    if (!form || !selectedDay || !exerciseDraft || !isStructureEditable) return;
    const name = exerciseDraft.name.trim();
    const id = exerciseDraft.id.trim();
    const sets = Number(exerciseDraft.sets);
    if (!name) {
      setFormError("Cada ejercicio necesita un nombre.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) {
      setFormError(
        "El ID estable debe usar letras, números, guiones o guion bajo y tener máximo 64 caracteres."
      );
      return;
    }
    if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
      setFormError("Las series deben ser un número entero entre 1 y 10.");
      return;
    }
    const secondsValue = exerciseDraft.duration45
      ? 45
      : exerciseDraft.seconds.trim()
        ? Number(exerciseDraft.seconds)
        : undefined;
    if (
      secondsValue !== undefined &&
      (!Number.isInteger(secondsValue) || secondsValue < 1)
    ) {
      setFormError(
        "La duración debe ser un número entero positivo o dejarse vacía."
      );
      return;
    }
    const nextExercise: Exercise = {
      id,
      name,
      videoUrl: exerciseDraft.videoUrl.trim(),
      thumbnail: exerciseDraft.thumbnail.trim(),
      block: 1,
      sets,
      reps: exerciseDraft.reps.trim(),
      ...(secondsValue ? { seconds: secondsValue } : {}),
      tips: exerciseDraft.tips.trim(),
      ...(exerciseDraft.sourceImage.trim()
        ? { sourceImage: exerciseDraft.sourceImage.trim() }
        : {}),
    };
    setForm(current => {
      if (!current) return current;
      const replaceDay = (day: RoutineDay) => {
        if (day.day !== selectedDayNumber) return day;
        const exists = day.exercises.some(item => item.id === id);
        return {
          ...day,
          exercises: exists
            ? day.exercises.map(item => (item.id === id ? nextExercise : item))
            : [...day.exercises, nextExercise],
        };
      };
      return {
        ...current,
        routine: {
          first: current.routine.first.map(replaceDay),
          second: current.routine.second.map(replaceDay),
        },
      };
    });
    setEditingExerciseId(id);
    setExerciseDraft(null);
    setFormError(null);
    setSavedAt(null);
  };

  const removeExercise = (id: string) => {
    if (!form || !isStructureEditable) return;
    setForm(current =>
      current
        ? {
            ...current,
            routine: {
              first: current.routine.first.map(day =>
                day.day === selectedDayNumber
                  ? {
                      ...day,
                      exercises: day.exercises.filter(item => item.id !== id),
                    }
                  : day
              ),
              second: current.routine.second.map(day =>
                day.day === selectedDayNumber
                  ? {
                      ...day,
                      exercises: day.exercises.filter(item => item.id !== id),
                    }
                  : day
              ),
            },
          }
        : current
    );
    if (editingExerciseId === id) {
      setEditingExerciseId(null);
      setExerciseDraft(null);
    }
    setSavedAt(null);
  };

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    const validation = validateEditablePlan(form);
    if (form.published && validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    setSavedAt(null);
    try {
      const result = isNew
        ? await api<{ plan: TrainingPlan }>("/admin/plans", {
            method: "POST",
            body: form,
          })
        : await api<{ plan: TrainingPlan }>(
            `/admin/plans/${encodeURIComponent(form.id)}`,
            { method: "PUT", body: form }
          );
      setForm(clonePlan(result.plan));
      setIsNew(false);
      setPlans(current => {
        const exists = current.some(item => item.id === result.plan.id);
        return exists
          ? current.map(item =>
              item.id === result.plan.id ? result.plan : item
            )
          : [...current, result.plan];
      });
      await refreshPlans();
      await loadPlans();
      setSavedAt(
        new Date().toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      toast.success(
        result.plan.published
          ? "Plan publicado y biblioteca actualizada."
          : "Borrador guardado."
      );
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el plan. Revisa los campos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="plan-admin-page">
      <section className="plan-admin-hero">
        <div>
          <span className="eyebrow">GESTIÓN DE CONTENIDO</span>
          <h1>
            Biblioteca de planes{" "}
            <span className="plan-admin-title-icon">
              <Library size={21} />
            </span>
          </h1>
          <p>
            Prepara borradores y publica rutinas sin tocar el código de Ritmo
            Fit.
          </p>
        </div>
        <div className="plan-admin-hero-actions">
          <Link href="/admin" className="button secondary">
            <ArrowLeft size={16} /> Volver a administración
          </Link>
          <button className="button primary" type="button" onClick={startDraft}>
            <CirclePlus size={16} /> Crear borrador
          </button>
        </div>
      </section>

      <div className="plan-admin-notice">
        <Info size={18} />
        <span>
          Las imágenes se guardan como URLs duraderas. Todavía no hay endpoint
          de carga: solicita a Manus una carga si necesitas alojar un archivo
          local.
        </span>
      </div>

      <div className="plan-admin-layout">
        <aside
          className="plan-admin-sidebar"
          aria-label="Planes disponibles para editar"
        >
          <div className="plan-admin-sidebar-heading">
            <div>
              <span className="eyebrow">CATÁLOGO ADMIN</span>
              <h2>Planes</h2>
            </div>
            <span className="admin-count">{plans.length}</span>
          </div>
          {loading ? (
            <PlanAdminLoading compact />
          ) : error ? (
            <div className="plan-admin-error">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button className="text-link" onClick={() => void loadPlans()}>
                <RefreshCw size={14} /> Reintentar
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <Library size={22} />
              <strong>Aún no hay planes</strong>
              <span>Crea el primer borrador para comenzar.</span>
            </div>
          ) : (
            <div className="plan-admin-list">
              {plans.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={`plan-admin-list-item ${form?.id === item.id && !isNew ? "active" : ""}`}
                  onClick={() => openPlan(item)}
                >
                  <span
                    className="plan-admin-list-cover"
                    style={{ background: item.color }}
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt="" />
                    ) : (
                      <Library size={19} />
                    )}
                  </span>
                  <span className="plan-admin-list-copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.weeks} {item.weeks === 1 ? "semana" : "semanas"} ·{" "}
                      {item.routine.first.length} días
                    </small>
                    <em className={item.published ? "published" : "draft"}>
                      {item.published ? "Publicado" : "Borrador"}
                    </em>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
        </aside>

        {!form ? (
          <section className="plan-admin-empty admin-card">
            <Library size={30} />
            <h2>Selecciona un plan</h2>
            <p>Elige un plan de la biblioteca o crea un borrador nuevo.</p>
            <button
              className="button primary"
              type="button"
              onClick={startDraft}
            >
              <Plus size={16} /> Crear borrador
            </button>
          </section>
        ) : (
          <form className="plan-admin-editor" onSubmit={savePlan}>
            <section className="plan-admin-card plan-admin-metadata">
              <div className="plan-admin-card-heading">
                <div>
                  <span className="eyebrow">FICHA DEL PLAN</span>
                  <h2>{isNew ? "Nuevo borrador" : `Editar ${form.title}`}</h2>
                </div>
                <span
                  className={`plan-status-pill ${form.published ? "published" : "draft"}`}
                >
                  {form.published ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <FilePenLine size={14} />
                  )}
                  {form.published ? "Publicado" : "Borrador"}
                </span>
              </div>
              <div className="plan-admin-fields">
                <label>
                  <span>
                    Título <b>*</b>
                  </span>
                  <input
                    required
                    maxLength={120}
                    value={form.title}
                    onChange={event => updateField("title", event.target.value)}
                    placeholder="Ej. Fuerza en casa"
                  />
                </label>
                <label>
                  <span>Subtítulo</span>
                  <input
                    maxLength={180}
                    value={form.subtitle}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("subtitle", event.target.value)
                    }
                    placeholder="Una frase breve para la biblioteca"
                  />
                </label>
                <label className="full">
                  <span>Descripción</span>
                  <textarea
                    maxLength={1600}
                    rows={4}
                    value={form.description}
                    onChange={event =>
                      updateField("description", event.target.value)
                    }
                    placeholder="Qué encontrará la persona en este plan"
                  />
                </label>
                <label>
                  <span>Color de marca</span>
                  <span className="color-input">
                    <input
                      type="color"
                      value={validColor(form.color) ? form.color : "#7c4ed4"}
                      onChange={event =>
                        updateField("color", event.target.value)
                      }
                    />
                    <input
                      value={form.color}
                      onChange={event =>
                        updateField("color", event.target.value)
                      }
                      placeholder="#7c4ed4"
                    />
                  </span>
                </label>
                <label>
                  <span>Cover URL</span>
                  <input
                    type="text"
                    inputMode="url"
                    value={form.coverImage}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("coverImage", event.target.value)
                    }
                    placeholder="https://… o /manus-storage/…"
                  />
                </label>
                <label>
                  <span>
                    Semanas del ciclo <b>*</b>
                  </span>
                  <select
                    value={form.weeks}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("weeks", Number(event.target.value))
                    }
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      week => (
                        <option key={week} value={week}>
                          {week} {week === 1 ? "semana" : "semanas"}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  <span>Descanso entre series (segundos)</span>
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={form.restSeconds}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("restSeconds", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  <span>Etiqueta de fuente</span>
                  <input
                    maxLength={180}
                    value={form.sourceLabel}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("sourceLabel", event.target.value)
                    }
                    placeholder="Láminas aportadas, guía propia…"
                  />
                </label>
                <label>
                  <span>Source URL</span>
                  <input
                    type="text"
                    inputMode="url"
                    value={form.sourceUrl ?? ""}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("sourceUrl", event.target.value || undefined)
                    }
                    placeholder="https://…"
                  />
                </label>
                <label className="full">
                  <span>
                    Aclaraciones visibles del plan{" "}
                    <small>una nota por línea</small>
                  </span>
                  <textarea
                    rows={3}
                    value={form.notes.join("\n")}
                    disabled={isLegacy}
                    onChange={event =>
                      updateField("notes", event.target.value.split("\n"))
                    }
                    placeholder="Aclaraciones de fuente o para quien entrena"
                  />
                </label>
              </div>
              <div className="plan-admin-metadata-footer">
                <div className="plan-mode-lock">
                  <ShieldCheck size={16} />
                  <span>
                    <strong>
                      {isLegacy
                        ? "Super series y niveles del PDF"
                        : "Series por ejercicio"}
                    </strong>
                    <small>
                      Los planes nuevos usan straight; no se crean super series
                      desde este formulario.
                    </small>
                  </span>
                </div>
                <label className="published-toggle">
                  <input
                    type="checkbox"
                    checked={form.published}
                    disabled={isLegacy}
                    onChange={event => {
                      setForm(current =>
                        current
                          ? {
                              ...current,
                              published: event.target.checked,
                              mode: current.mode,
                            }
                          : current
                      );
                      setFormError(null);
                    }}
                  />
                  <span>
                    <strong>Publicar en la biblioteca</strong>
                    <small>
                      Solo se puede publicar con días y ejercicios completos.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <section className="plan-admin-card plan-admin-routine">
              <div className="plan-admin-card-heading">
                <div>
                  <span className="eyebrow">RUTINA</span>
                  <h2>
                    {isLegacy
                      ? "Rutina original en solo lectura"
                      : "Días y ejercicios"}
                  </h2>
                </div>
                {isLegacy ? (
                  <span className="read-only-pill">
                    <LockKeyhole size={13} /> Solo lectura
                  </span>
                ) : (
                  <span className="plan-admin-muted">
                    La segunda fase replica la primera
                  </span>
                )}
              </div>
              {isLegacy ? (
                <LegacyRoutinePreview plan={form} />
              ) : (
                <>
                  <div className="plan-admin-structure-note">
                    <Info size={15} />
                    {form.id === "tonificar"
                      ? "Tonificar conserva sus IDs. Si ya tiene progreso, el servidor rechazará cambios de estructura con 409; metadata, tips, imágenes y videos siguen editables."
                      : "Los días nuevos se clonan en first y second para mantener un ciclo sencillo de 1 a 12 semanas."}
                  </div>
                  <div
                    className="day-picker"
                    aria-label="Seleccionar o añadir día"
                  >
                    {DAY_LABELS.map((label, index) => {
                      const dayNumber = index + 1;
                      const exists = existingDayNumbers.has(dayNumber);
                      return (
                        <button
                          type="button"
                          key={dayNumber}
                          className={`${selectedDayNumber === dayNumber ? "active" : ""} ${exists ? "exists" : "new"}`}
                          onClick={() => {
                            setSelectedDayNumber(dayNumber);
                            if (!exists) addDay(dayNumber);
                          }}
                        >
                          <strong>Día {dayNumber}</strong>
                          <span>{label}</span>
                          {exists ? <Check size={13} /> : <Plus size={13} />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDay ? (
                    <div className="day-editor">
                      <div className="day-editor-heading">
                        <div>
                          <span className="plan-admin-kicker">
                            DÍA {selectedDay.day}
                          </span>
                          <h3>{selectedDay.label || "Día sin título"}</h3>
                        </div>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={removeDay}
                          aria-label="Quitar día"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="plan-admin-fields day-fields">
                        <label>
                          <span>
                            Título del día <b>*</b>
                          </span>
                          <input
                            required
                            maxLength={120}
                            value={selectedDay.label}
                            onChange={event =>
                              updateDay({ label: event.target.value })
                            }
                            placeholder={DAY_LABELS[selectedDay.day - 1]}
                          />
                        </label>
                        <label>
                          <span>
                            Focus <b>*</b>
                          </span>
                          <input
                            required
                            maxLength={180}
                            value={selectedDay.focus}
                            onChange={event =>
                              updateDay({ focus: event.target.value })
                            }
                            placeholder="Ej. Tren inferior"
                          />
                        </label>
                        <label className="full">
                          <span>Descripción breve del día</span>
                          <textarea
                            rows={2}
                            maxLength={500}
                            value={selectedDay.subtitle}
                            onChange={event =>
                              updateDay({ subtitle: event.target.value })
                            }
                            placeholder="Cómo se organiza esta sesión"
                          />
                        </label>
                        <label className="full">
                          <span>Source image URL</span>
                          <span className="input-with-icon">
                            <ImagePlus size={15} />
                            <input
                              type="text"
                              inputMode="url"
                              value={selectedDay.sourceImage ?? ""}
                              onChange={event =>
                                updateDay({
                                  sourceImage: event.target.value || undefined,
                                })
                              }
                              placeholder="https://… o /manus-storage/…"
                            />
                          </span>
                        </label>
                      </div>

                      <div className="exercise-list-heading">
                        <div>
                          <span className="plan-admin-kicker">EJERCICIOS</span>
                          <h3>
                            {selectedDay.exercises.length}{" "}
                            {selectedDay.exercises.length === 1
                              ? "ejercicio"
                              : "ejercicios"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={createExerciseDraft}
                        >
                          <Plus size={15} /> Añadir ejercicio
                        </button>
                      </div>
                      {selectedDay.exercises.length === 0 ? (
                        <div className="plan-admin-empty-inline">
                          <CirclePlus size={19} />
                          <strong>Este día aún no tiene ejercicios.</strong>
                          <span>Añade al menos uno para poder publicar.</span>
                        </div>
                      ) : (
                        <div className="exercise-admin-list">
                          {selectedDay.exercises.map((exercise, index) => (
                            <div
                              className={`exercise-admin-row ${editingExerciseId === exercise.id ? "selected" : ""}`}
                              key={exercise.id}
                            >
                              <span className="exercise-admin-number">
                                {index + 1}
                              </span>
                              {exercise.thumbnail ? (
                                <img src={exercise.thumbnail} alt="" />
                              ) : (
                                <span className="exercise-admin-image">
                                  <ImagePlus size={16} />
                                </span>
                              )}
                              <div className="exercise-admin-copy">
                                <strong>{exercise.name || "Sin nombre"}</strong>
                                <span>
                                  {exercise.sets ?? 3} series ·{" "}
                                  {exercise.seconds
                                    ? `${exercise.seconds} segundos`
                                    : exercise.reps || "sin repeticiones"}
                                </span>
                                <small>{exercise.id}</small>
                              </div>
                              <div className="exercise-admin-row-actions">
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => editExercise(exercise)}
                                  aria-label={`Editar ${exercise.name}`}
                                >
                                  <FilePenLine size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button danger"
                                  onClick={() => removeExercise(exercise.id)}
                                  aria-label={`Eliminar ${exercise.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {exerciseDraft && (
                        <ExerciseEditor
                          draft={exerciseDraft}
                          onChange={setExerciseDraft}
                          onCancel={() => setExerciseDraft(null)}
                          onSave={saveExercise}
                          isNew={!editingExerciseId}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="plan-admin-empty-inline">
                      <CirclePlus size={19} />
                      <strong>Selecciona un día para comenzar.</strong>
                      <span>
                        Los días se pueden añadir con los botones de arriba.
                      </span>
                    </div>
                  )}
                </>
              )}
            </section>

            {formError && (
              <div className="form-error plan-admin-form-error" role="alert">
                <AlertCircle size={17} />
                <span>{formError}</span>
              </div>
            )}
            {savedAt && (
              <div
                className="form-success plan-admin-form-success"
                role="status"
              >
                <Check size={17} />
                <span>Último guardado a las {savedAt}.</span>
              </div>
            )}
            <div className="plan-admin-save-bar">
              <span>
                {isNew
                  ? "Guarda primero como borrador para seguir editando."
                  : "Los cambios se validan y se guardan en el backend."}
              </span>
              <button
                type="submit"
                className="button primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Save size={16} />{" "}
                    {form.published ? "Guardar y publicar" : "Guardar borrador"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ExerciseEditor({
  draft,
  onChange,
  onCancel,
  onSave,
  isNew,
}: {
  draft: ExerciseDraft;
  onChange: (draft: ExerciseDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  isNew: boolean;
}) {
  const set = <K extends keyof ExerciseDraft>(
    field: K,
    value: ExerciseDraft[K]
  ) => onChange({ ...draft, [field]: value });
  return (
    <div className="exercise-editor">
      <div className="exercise-editor-heading">
        <div>
          <span className="plan-admin-kicker">
            {isNew ? "NUEVO EJERCICIO" : "EDITAR EJERCICIO"}
          </span>
          <h3>Cantidades y referencias</h3>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Cerrar editor"
        >
          <X size={17} />
        </button>
      </div>
      <div className="plan-admin-fields">
        <label className="full">
          <span>
            ID estable <small>no editable · máximo 64 caracteres</small>
          </span>
          <input readOnly value={draft.id} />
        </label>
        <label>
          <span>
            Nombre <b>*</b>
          </span>
          <input
            required
            maxLength={120}
            value={draft.name}
            onChange={event => set("name", event.target.value)}
            placeholder="Ej. Sentadilla"
          />
        </label>
        <label>
          <span>
            Series <b>*</b>
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.sets}
            onChange={event => set("sets", event.target.value)}
          />
        </label>
        <label>
          <span>Repeticiones</span>
          <input
            maxLength={120}
            value={draft.reps}
            onChange={event => set("reps", event.target.value)}
            placeholder="10 por pierna"
          />
        </label>
        <label>
          <span>Duración en segundos</span>
          <input
            type="number"
            min={1}
            max={3600}
            value={draft.seconds}
            disabled={draft.duration45}
            onChange={event => set("seconds", event.target.value)}
            placeholder="Opcional"
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={draft.duration45}
            onChange={event => set("duration45", event.target.checked)}
          />
          <span>
            <strong>Duración de 45 segundos</strong>
            <small>
              Activa esta opción para planchas y bloques cronometrados.
            </small>
          </span>
        </label>
        <label className="full">
          <span>Tips</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={draft.tips}
            onChange={event => set("tips", event.target.value)}
            placeholder="Indicaciones claras para la técnica"
          />
        </label>
        <label>
          <span>
            Video URL <small>YouTube, Vimeo o vacío</small>
          </span>
          <span className="input-with-icon">
            <Video size={15} />
            <input
              type="text"
              inputMode="url"
              value={draft.videoUrl}
              onChange={event => set("videoUrl", event.target.value)}
              placeholder="https://youtube.com/…"
            />
          </span>
        </label>
        <label>
          <span>Image / thumbnail URL</span>
          <input
            type="text"
            inputMode="url"
            value={draft.thumbnail}
            onChange={event => set("thumbnail", event.target.value)}
            placeholder="https://… o /manus-storage/…"
          />
        </label>
        <label className="full">
          <span>
            Source image URL <small>opcional</small>
          </span>
          <input
            type="text"
            inputMode="url"
            value={draft.sourceImage}
            onChange={event => set("sourceImage", event.target.value)}
            placeholder="https://… o /manus-storage/…"
          />
        </label>
      </div>
      <div className="exercise-editor-actions">
        <button
          type="button"
          className="button secondary small"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="button" className="button primary small" onClick={onSave}>
          <Check size={15} /> {isNew ? "Añadir ejercicio" : "Aplicar ejercicio"}
        </button>
      </div>
    </div>
  );
}

function LegacyRoutinePreview({ plan }: { plan: TrainingPlan }) {
  return (
    <div className="legacy-routine-preview">
      <div className="plan-admin-structure-note">
        <LockKeyhole size={15} />
        Adelgazar no cambia su estructura ni cantidades en esta biblioteca. Usa
        el editor original de la pestaña Contenido para nombre, Vimeo y tips.
      </div>
      {plan.routine.first.map(day => (
        <details key={day.day} open={day.day === plan.routine.first[0]?.day}>
          <summary>
            <span>
              <strong>
                Día {day.day} · {day.label}
              </strong>
              <small>{day.focus}</small>
            </span>
            <em>{day.exercises.length} ejercicios</em>
          </summary>
          <div className="legacy-exercise-lines">
            {day.exercises.map(exercise => (
              <div key={exercise.id}>
                <span>{exercise.name}</span>
                <small>
                  {exercise.sets ?? "Nivel PDF"} series ·{" "}
                  {exercise.reps ?? "Cantidad original"} · ID {exercise.id}
                </small>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function clonePlan(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    notes: [...plan.notes],
    routine: {
      first: plan.routine.first.map(cloneDay),
      second: plan.routine.second.map(cloneDay),
    },
  };
}

function cloneDay(day: RoutineDay): RoutineDay {
  return {
    ...day,
    exercises: day.exercises.map(exercise => ({ ...exercise })),
  };
}

function createDay(day: number): RoutineDay {
  return {
    day,
    label: DAY_LABELS[day - 1],
    focus: "",
    subtitle: "",
    page: 0,
    exercises: [],
  };
}

function createEmptyPlan(): TrainingPlan {
  const id = `plan-nuevo-${Date.now().toString(36)}`;
  return {
    id,
    title: "Nuevo plan",
    subtitle: "",
    description: "",
    color: "#7c4ed4",
    coverImage: "",
    weeks: 4,
    mode: "straight",
    restSeconds: 90,
    published: false,
    sourceLabel: "",
    notes: [],
    routine: { first: [], second: [] },
  };
}

function nextExerciseId(planId: string, day: number, exercises: Exercise[]) {
  const prefix = `plan-${planId.replace(/[^a-z0-9-]/gi, "-").slice(0, 45)}-d${day}-e`;
  let index = exercises.length + 1;
  while (exercises.some(exercise => exercise.id === `${prefix}${index}`))
    index += 1;
  return `${prefix}${index}`.slice(0, 64);
}

function validColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function PlanAdminLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`admin-loading ${compact ? "compact" : ""}`} role="status">
      <RefreshCw size={compact ? 18 : 22} className="spin" />
      <span>Cargando planes reales…</span>
    </div>
  );
}

function AdminGate({ mode }: { mode: "login" | "restricted" }) {
  const restricted = mode === "restricted";
  return (
    <section className="admin-gate">
      <span className="admin-gate-icon">
        {restricted ? <ShieldCheck size={24} /> : <LockKeyhole size={24} />}
      </span>
      <span className="eyebrow">
        {restricted ? "ÁREA RESTRINGIDA" : "ACCESO REQUERIDO"}
      </span>
      <h1>
        {restricted
          ? "No tienes permisos de administración."
          : "Inicia sesión para continuar."}
      </h1>
      <p>
        {restricted
          ? "Tu cuenta puede seguir usando tu programa, pero este espacio está reservado para el rol administrador."
          : "La administración está disponible solo para cuentas autorizadas."}
      </p>
      <Link
        href={restricted ? "/" : "/acceso"}
        className={`button ${restricted ? "secondary" : "primary"}`}
      >
        {restricted ? "Volver a mi entrenamiento" : "Ir a acceso"}{" "}
        <ArrowLeft size={16} />
      </Link>
    </section>
  );
}
