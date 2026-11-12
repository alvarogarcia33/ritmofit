import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  Layers3,
  LockKeyhole,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import {
  planDays,
  planTotalSessions,
  type TrainingPlan,
} from "@shared/programs";

type PersonalPlanState = { plan: TrainingPlan; hasProgress: boolean };

export default function Plans() {
  const {
    plans,
    planId,
    user,
    progress,
    enrollments,
    selectPlan,
    loading,
    planLoading,
  } = useFit();
  const [, navigate] = useLocation();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [personalPlan, setPersonalPlan] = useState<PersonalPlanState | null>(
    null
  );
  const [personalLoading, setPersonalLoading] = useState(true);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const loadPersonalPlan = useCallback(async () => {
    setPersonalLoading(true);
    setPersonalError(null);
    try {
      const result = await api<{
        plan: TrainingPlan | null;
        hasProgress: boolean;
      }>("/personal-plan");
      setPersonalPlan(
        result.plan
          ? { plan: result.plan, hasProgress: Boolean(result.hasProgress) }
          : null
      );
    } catch (error) {
      setPersonalError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar tu Plan Personal."
      );
    } finally {
      setPersonalLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadPersonalPlan();
  }, [loadPersonalPlan]);
  const publicPlans = plans.filter(p => !p.isPersonal);
  const openPersonalPlan = () => navigate("/plan-personal");
  const choose = async (id: string) => {
    setSelecting(id);
    try {
      await selectPlan(id);
      navigate("/entrenamiento");
      toast.success(
        "Tu plan está listo. Los avances de tus otros planes se conservan."
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSelecting(null);
    }
  };
  const completed = progress.filter(p => p.completedAt).length;
  return (
    <FitLayout title="Mis planes">
      <section className="page-intro plans-intro">
        <div>
          <span className="eyebrow">UN OBJETIVO. TU PROPIO RITMO.</span>
          <h1>
            Elige cómo quieres entrenar.
            <Sparkles size={26} />
          </h1>
          <p>
            Cada plan tiene su camino. Tus sesiones, tus estrellas y tu historia
            siguen contigo.
          </p>
        </div>
        <span className="plans-count">
          <Layers3 size={17} />
          {publicPlans.length + (personalPlan ? 1 : 0)} planes disponibles
        </span>
      </section>
      {user && (
        <section className="continue-plan">
          <div className="continue-star">
            <Star size={24} />
          </div>
          <div>
            <span>VOLVER A TU CAMINO</span>
            <strong>
              {plans.find(p => p.id === planId)?.title ?? "Tu entrenamiento"}
            </strong>
            <p>
              {completed} sesiones cumplidas en este plan · retoma sin empezar
              de cero.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={planLoading || loading || !!selecting}
            onClick={() => void choose(planId)}
          >
            Continuar <ArrowRight size={16} />
          </button>
        </section>
      )}
      <section className="plan-card-list" aria-label="Planes de entrenamiento">
        {publicPlans.map((p, index) => {
          const active = user && p.id === planId;
          const enrolled = enrollments.some(e => e.planId === p.id);
          const days = planDays(p, 1).length;
          return (
            <article
              className={`plan-choice-card ${active ? "is-current" : ""}`}
              style={{ "--plan-card-color": p.color } as CSSProperties}
              key={p.id}
            >
              <div className="plan-card-visual">
                <img
                  src={p.coverImage}
                  alt={`Referencia del plan ${p.title}`}
                  loading={index ? "lazy" : "eager"}
                />
                <div className="plan-image-shade" />
                <span className="plan-card-number">0{index + 1}</span>
                <span className="plan-card-image-label">{p.subtitle}</span>
                {active && (
                  <span className="current-plan-badge">
                    <Check size={12} />
                    TU PLAN ACTUAL
                  </span>
                )}
              </div>
              <div className="plan-choice-copy">
                <span className="eyebrow">{p.sourceLabel}</span>
                <h2>
                  {p.title}
                  <span>.</span>
                </h2>
                <p>{p.description}</p>
                <div className="plan-choice-details">
                  <span>
                    <CalendarDays size={16} />
                    {days} días / semana
                  </span>
                  <span>
                    <Dumbbell size={16} />
                    {p.mode === "supersets"
                      ? "3 niveles"
                      : "Series por ejercicio"}
                  </span>
                  <span>
                    <Star size={16} />
                    {planTotalSessions(p)} sesiones de seguimiento
                  </span>
                </div>
                <small>
                  {p.id === "tonificar"
                    ? "Cuatro semanas de seguimiento organizadas por la app; cantidades de las láminas originales."
                    : `${p.weeks} ${p.weeks === 1 ? "semana" : "semanas"} · progreso independiente de tus otros planes.`}
                </small>
                <button
                  className="button plan-choice-button"
                  disabled={loading || planLoading || !!selecting}
                  onClick={() => void choose(p.id)}
                >
                  {selecting === p.id
                    ? "Preparando…"
                    : active || enrolled
                      ? "Continuar este plan"
                      : "Elegir este plan"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </article>
          );
        })}
        {personalPlan && (
          <article
            className={`plan-choice-card ${personalPlan.plan.id === planId ? "is-current" : ""}`}
            style={
              { "--plan-card-color": personalPlan.plan.color } as CSSProperties
            }
            key={personalPlan.plan.id}
          >
            <div className="plan-card-visual">
              <img
                src={personalPlan.plan.coverImage}
                alt="Portada compartida del Plan Personal"
                loading="lazy"
              />
              <div className="plan-image-shade" />
              <span className="plan-card-number">
                {String(publicPlans.length + 1).padStart(2, "0")}
              </span>
              <span className="plan-card-image-label">
                Tu selección. Tu ritmo.
              </span>
              {personalPlan.plan.id === planId && (
                <span className="current-plan-badge">
                  <Check size={12} /> TU PLAN ACTUAL
                </span>
              )}
            </div>
            <div className="plan-choice-copy">
              <span className="eyebrow">
                <LockKeyhole size={13} /> PRIVADO · SOLO VOS
              </span>
              <h2>
                Plan Personal<span>.</span>
              </h2>
              <p>{personalPlan.plan.description}</p>
              <div className="plan-choice-details">
                <span>
                  <CalendarDays size={16} />
                  {planDays(personalPlan.plan, 1).length} días / semana
                </span>
                <span>
                  <Dumbbell size={16} /> Series por ejercicio
                </span>
                <span>
                  <Star size={16} />
                  {personalPlan.plan.continuous
                    ? "Entrenamiento continuo"
                    : `${planTotalSessions(personalPlan.plan)} sesiones de seguimiento`}
                </span>
              </div>
              <small>
                {personalPlan.plan.continuous
                  ? "Sin fecha de fin · las semanas se repiten y tus registros se acumulan."
                  : `${personalPlan.plan.weeks} semanas de seguimiento.`}{" "}
                No se comparte con otras cuentas. Administración puede consultar
                tu seguimiento; tus registros quedan asociados a esta rutina.
              </small>
              <button
                className="button plan-choice-button"
                disabled={
                  loading || planLoading || !!selecting || personalLoading
                }
                onClick={openPersonalPlan}
              >
                Editar tu rutina
                <ArrowRight size={17} />
              </button>
            </div>
          </article>
        )}
      </section>
      <section className="plans-bottom-note">
        <span className="metric-icon lavender">
          {personalPlan ? <LockKeyhole size={23} /> : <Layers3 size={23} />}
        </span>
        <div>
          <h3>
            {personalPlan
              ? "Tu rutina, siempre a mano."
              : "Armá tu propio plan."}
          </h3>
          <p>
            {personalPlan
              ? "Podés editar ejercicios, días, orden y series incluso después de entrenar. Cada versión anterior queda archivada con sus sesiones y fechas."
              : "Elegí ejercicios de lunes a domingo y ajustá series y repeticiones. El plan queda privado y asociado a tu cuenta."}
          </p>
          {personalError && (
            <p role="alert">
              No pudimos comprobar tu rutina. {personalError}{" "}
              <button
                className="text-link"
                onClick={() => void loadPersonalPlan()}
              >
                Reintentar
              </button>
            </p>
          )}
          <button
            className="button primary"
            style={{ background: "#238b83", borderColor: "#238b83" }}
            disabled={personalLoading || planLoading || !!selecting}
            onClick={openPersonalPlan}
          >
            {personalLoading
              ? "Buscando tu plan…"
              : personalPlan
                ? "Editar Plan Personal"
                : "Crear Plan Personal"}
            <ArrowRight size={16} />
          </button>
          {user?.role === "admin" && (
            <Link href="/admin/planes" className="text-link">
              Administrar planes <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </section>
    </FitLayout>
  );
}
