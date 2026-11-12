import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  BarChart3,
  Dumbbell,
  Info,
  Medal,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrainingPlan } from "@shared/programs";
import type { PersonalPlanArchive, Progress } from "@/lib/fit";
import {
  buildStrengthAnalytics,
  formatStrengthNumber,
} from "@/lib/strength-analytics";

type Metric = "weightKg" | "volumeKg";

type StrengthInsightsProps = {
  plan: TrainingPlan;
  startDate: string;
  progress: readonly Progress[];
  archives: readonly PersonalPlanArchive[];
  archivesLoading?: boolean;
  archivesError?: string | null;
};

function readableDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;
}

export function StrengthInsights({
  plan,
  startDate,
  progress,
  archives,
  archivesLoading = false,
  archivesError = null,
}: StrengthInsightsProps) {
  const [selectedId, setSelectedId] = useState("");
  const [metric, setMetric] = useState<Metric>("weightKg");

  const analytics = useMemo(() =>
    buildStrengthAnalytics(plan, startDate, progress, archives),
    [plan, startDate, progress, archives]
  );
  const selected = analytics.exercises.find(exercise => exercise.id === selectedId)
    ?? analytics.exercises[0];
  const points = (selected?.timeline ?? [])
    .filter(item => item[metric] !== null)
    .map(item => ({
      ...item,
      label: shortDate(item.date),
    }));
  const latest = selected?.timeline.at(-1);
  const weekPoints = analytics.weeklyVolume.slice(-8);

  return (
    <section className="strength-insights" aria-labelledby="strength-insights-title">
      <div className="section-heading">
        <div>
          <span className="strength-eyebrow">REGISTROS REALES · KG</span>
          <h2 id="strength-insights-title">Tu evolución de fuerza</h2>
          <p>
            Carga máxima por ejercicio y volumen registrado, contando solamente
            las series realmente marcadas como completas.
          </p>
        </div>
        <TrendingUp size={24} aria-hidden="true" />
      </div>

      {archivesLoading ? (
        <div className="strength-empty" role="status">
          Cargando tus sesiones y las versiones anteriores para calcular las estadísticas…
        </div>
      ) : (
        <>
          {archivesError && plan.isPersonal && (
            <p className="strength-warning" role="alert">
              No se pudo recuperar el historial archivado. Estas estadísticas
              incluyen solamente la versión actual de tu Plan Personal.
            </p>
          )}

          {!analytics.exercises.length ? (
            <div className="strength-empty">
              <Dumbbell size={25} aria-hidden="true" />
              <h3>Tu primera marca de fuerza empieza en una serie</h3>
              <p>
                Registrá kilos o repeticiones y marcá la serie como completada.
                Cuando haya resultados medidos, aparecerán tus gráficos. Los
                entrenamientos anteriores sin esos datos no se estiman.
              </p>
              <Link className="button secondary" href="/entrenamiento">
                Ir a registrar una serie
              </Link>
            </div>
          ) : (
            <>
              <div className="strength-kpis">
                <div className="strength-kpi">
                  <Activity size={18} aria-hidden="true" />
                  <span>Volumen con datos completos</span>
                  <strong>
                    {formatStrengthNumber(analytics.totalVolumeKg)}
                    <small> kg × reps</small>
                  </strong>
                </div>
                <div className="strength-kpi">
                  <BarChart3 size={18} aria-hidden="true" />
                  <span>Series con peso y reps</span>
                  <strong>
                    {formatStrengthNumber(analytics.volumeSets)}
                    <small> de {analytics.measuredSets} medidas</small>
                  </strong>
                </div>
                <div className="strength-kpi">
                  <Medal size={18} aria-hidden="true" />
                  <span>Ejercicios con mediciones</span>
                  <strong>{analytics.exercises.length}</strong>
                </div>
              </div>

              <div className="strength-charts">
                <section className="strength-chart-card" aria-labelledby="strength-exercise-title">
                  <div className="strength-card-header">
                    <div>
                      <h3 id="strength-exercise-title">Evolución por ejercicio</h3>
                      <p>Compará el mismo movimiento, incluso entre versiones del plan.</p>
                    </div>
                  </div>

                  <label className="strength-exercise-picker">
                    <span>Ejercicio</span>
                    <select
                      value={selected?.id ?? ""}
                      onChange={event => setSelectedId(event.target.value)}
                      aria-label="Seleccionar ejercicio para ver evolución de fuerza"
                    >
                      {analytics.exercises.map(exercise => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="strength-metric-toggle" role="group" aria-label="Métrica por ejercicio">
                    <button
                      type="button"
                      className={metric === "weightKg" ? "selected" : ""}
                      aria-pressed={metric === "weightKg"}
                      onClick={() => setMetric("weightKg")}
                    >
                      Peso máximo
                    </button>
                    <button
                      type="button"
                      className={metric === "volumeKg" ? "selected" : ""}
                      aria-pressed={metric === "volumeKg"}
                      onClick={() => setMetric("volumeKg")}
                    >
                      Volumen
                    </button>
                  </div>

                  {selected && (
                    <div className="strength-exercise-facts">
                      <div>
                        <span>Máxima carga registrada</span>
                        <strong>
                          {selected.maxWeightKg === null
                            ? "Sin peso"
                            : `${formatStrengthNumber(selected.maxWeightKg)} kg`}
                        </strong>
                        {selected.bestLoadDate && (
                          <small>{readableDate(selected.bestLoadDate)}</small>
                        )}
                      </div>
                      <div>
                        <span>Volumen registrado</span>
                        <strong>{formatStrengthNumber(selected.totalVolumeKg)} kg × reps</strong>
                        <small>{selected.volumeSets} series con datos completos</small>
                      </div>
                    </div>
                  )}

                  {points.length ? (
                    <div
                      className="strength-chart-area"
                      role="img"
                      aria-label={
                        `${selected?.name ?? "Ejercicio"}: ${metric === "weightKg" ? "máximo peso" : "volumen"} registrado en ${points.length} fechas`
                      }
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={points} margin={{ top: 12, right: 14, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 4" stroke="#e4edea" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#627873" }}
                            minTickGap={16}
                          />
                          <YAxis
                            domain={[0, "auto"]}
                            tickLine={false}
                            axisLine={false}
                            width={52}
                            tick={{ fontSize: 11, fill: "#627873" }}
                          />
                          <Tooltip
                            labelFormatter={(_, items) =>
                              items?.length && items[0]?.payload?.date
                                ? readableDate(String(items[0].payload.date))
                                : ""
                            }
                            formatter={value => [
                              `${formatStrengthNumber(Number(value))} ${metric === "weightKg" ? "kg" : "kg × reps"}`,
                              metric === "weightKg" ? "Máximo por serie" : "Volumen registrado",
                            ]}
                            contentStyle={{ borderRadius: 9, border: "1px solid #d9e6e0", fontSize: 12 }}
                          />
                          <Line
                            dataKey={metric}
                            stroke="#238b83"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#238b83", stroke: "#fff", strokeWidth: 1 }}
                            activeDot={{ r: 6 }}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="strength-muted">
                      {metric === "weightKg"
                        ? "Este ejercicio todavía no tiene series completadas con peso registrado."
                        : "Para calcular volumen necesitás guardar tanto el peso como las repeticiones reales."}
                    </p>
                  )}
                  {selected && (
                    <p className="strength-chart-footnote">
                      {selected.sessionsWithMarks} fechas con registros ·{" "}
                      {selected.completedMeasuredSets} series medidas.
                      {latest ? ` Último registro: ${readableDate(latest.date)}.` : ""}
                    </p>
                  )}
                </section>

                <section className="strength-chart-card" aria-labelledby="strength-weeks-title">
                  <div className="strength-card-header">
                    <div>
                      <h3 id="strength-weeks-title">Volumen semanal registrado</h3>
                      <p>Últimas 8 semanas con peso y repeticiones completas, sumando los ejercicios de este plan.</p>
                    </div>
                  </div>
                  {weekPoints.length ? (
                    <div
                      className="strength-chart-area"
                      role="img"
                      aria-label="Volumen externo en kg multiplicado por repeticiones, agrupado por semana calendario"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekPoints} margin={{ top: 12, right: 10, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 4" stroke="#e4edea" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#627873" }}
                            minTickGap={16}
                          />
                          <YAxis
                            domain={[0, "auto"]}
                            tickLine={false}
                            axisLine={false}
                            width={52}
                            tick={{ fontSize: 11, fill: "#627873" }}
                          />
                          <Tooltip
                            formatter={value => [
                              `${formatStrengthNumber(Number(value))} kg × reps`,
                              "Volumen registrado",
                            ]}
                            contentStyle={{ borderRadius: 9, border: "1px solid #d9e6e0", fontSize: 12 }}
                          />
                          <Bar dataKey="volumeKg" fill="#238b83" radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="strength-muted">
                      Todavía no hay series completadas con peso y repeticiones registrados.
                    </p>
                  )}
                  <p className="strength-chart-footnote">
                    Solo aparecen semanas con mediciones completas. Las semanas
                    sin registros no se representan como cero y las variaciones
                    pueden reflejar cambios en la cantidad de ejercicios.
                  </p>
                </section>
              </div>

              <details className="strength-methodology">
                <summary><Info size={16} aria-hidden="true" /> Cómo se calculan estas estadísticas</summary>
                <p>
                  El volumen es la suma de <strong>peso externo registrado (kg) × repeticiones
                  efectivamente anotadas</strong> en cada serie completada.
                  No equivale a calorías, peso corporal movilizado ni intensidad física.
                  El peso máximo es la carga más alta registrada en una serie, no
                  una estimación de repetición máxima (1RM).
                </p>
                <p>
                  Se incluyen las versiones archivadas de tu Plan Personal cuando
                  están disponibles. Las series sin marca de cumplimiento,
                  sin medidas o con solo un dato no aportan volumen;
                  tampoco se completan retroactivamente con valores supuestos.
                  {analytics.missingMeasurements > 0 && (
                    <>
                      {" "}Hay {analytics.missingMeasurements} series completadas sin
                      una medición utilizable de peso o repeticiones.
                    </>
                  )}
                </p>
              </details>
            </>
          )}
        </>
      )}
    </section>
  );
}
