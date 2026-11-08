import { useState, type CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  Layers3,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import { planDays, planTotalSessions } from "@shared/programs";

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
          {plans.length} planes disponibles
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
        {plans.map((p, index) => {
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
      </section>
      <section className="plans-bottom-note">
        <span className="metric-icon lavender">
          <Layers3 size={23} />
        </span>
        <div>
          <h3>Una biblioteca que puede crecer.</h3>
          <p>
            Podrás sumar planes nuevos aquí. Cambiar de objetivo no borra tus
            registros ni mezcla el cumplimiento de una rutina con otra.
          </p>
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
