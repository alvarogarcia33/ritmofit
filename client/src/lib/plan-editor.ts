import { LEGACY_PLAN_ID, type TrainingPlan } from "@shared/programs";

export function validateEditablePlan(plan: TrainingPlan): string | null {
  if (!plan.title.trim()) return "El título del plan es obligatorio.";
  if (!Number.isInteger(plan.weeks) || plan.weeks < 1 || plan.weeks > 12)
    return "El ciclo debe tener entre 1 y 12 semanas.";
  if (!/^#[0-9a-f]{6}$/i.test(plan.color))
    return "Elige un color hexadecimal válido.";
  if (!plan.published || plan.id === LEGACY_PLAN_ID) return null;
  if (!plan.coverImage.trim())
    return "Para publicar, añade una imagen de portada.";
  if (plan.routine.first.length === 0)
    return "Para publicar, añade al menos un día.";
  const incompleteDay = plan.routine.first.find(
    day => !day.label.trim() || !day.focus.trim() || day.exercises.length === 0
  );
  if (incompleteDay)
    return `Completa el título, enfoque y al menos un ejercicio del día ${incompleteDay.day}.`;
  const invalidExercise = plan.routine.first
    .flatMap(day => day.exercises)
    .find(
      e =>
        !e.name.trim() ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(e.id) ||
        !Number.isInteger(e.sets) ||
        !e.sets ||
        e.sets < 1 ||
        e.sets > 10
    );
  if (invalidExercise)
    return `Revisa el ejercicio «${invalidExercise.name || invalidExercise.id}»: nombre, ID estable y series son obligatorios.`;
  return null;
}
