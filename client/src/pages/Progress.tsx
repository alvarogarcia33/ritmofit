import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarCheck2,
  Check,
  Dumbbell,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FitLayout } from "@/components/FitLayout";
import { EmptyState } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import { api, dateLabel, dayDate, type PersonalPlanArchive } from "@/lib/fit";
import { planDays, planTotalSessions } from "@shared/programs";

export default function ProgressPage() {
  const { planUser: user, loading, planLoading, progress, plan } = useFit();
  const [archives, setArchives] = useState<PersonalPlanArchive[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [archivesError, setArchivesError] = useState<string | null>(null);
  const [openArchive, setOpenArchive] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !plan.isPersonal) {
      setArchives([]);
      setArchivesError(null);
      setArchivesLoading(false);
      return;
    }
    let active = true;
    setArchives([]);
    setArchivesLoading(true);
    setArchivesError(null);
    void api<{ versions: PersonalPlanArchive[] }>("/personal-plan/versions")
      .then(data => {
        if (active) setArchives(data.versions);
      })
      .catch(error => {
        if (active) {
          setArchivesError(
            error instanceof Error ? error.message : "No se pudo cargar el historial."
          );
        }
      })
      .finally(() => {
        if (active) setArchivesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, plan.id, plan.isPersonal]);

  const archivedSessions = archives.reduce(
    (total, edition) =>
      total + edition.progress.filter(record => record.completedAt).length,
    0
  );
  const archivedSets = archives.reduce(
    (total, edition) =>
      total + edition.progress.reduce((count, record) => count + record.completedSets.length, 0),
    0
  );
  const totalSessions = planTotalSessions(plan);
  const completed = progress.filter(p => p.completedAt).length;
  const totalSets = progress.reduce(
    (sum, p) => sum + p.completedSets.length,
    0
  );
  const chart = Array.from({ length: plan.weeks }, (_, i) => i + 1).map(
    week => ({
      name: `Semana ${week}`,
      sesiones: progress.filter(
        p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
      ).length,
      series: progress
        .filter(p => p.dayKey.startsWith(`w${week}-`))
        .reduce((sum, p) => sum + p.completedSets.length, 0),
    })
  );
  const history = [...progress]
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .filter(p => p.completedSets.length || p.cardioDone || p.warmupDone);
  return (
    <FitLayout title="Mi progreso">
      <section className="page-intro">
        <div>
          <span className="eyebrow">ESTO LO ESTÁS CONSTRUYENDO TÚ</span>
          <h1>Tu constancia se ve.</h1>
          <p>{plan.title} · cada registro corresponde solo a este plan.</p>
        </div>
        <Link className="button secondary" href="/entrenamiento">
          Volver a entrenar <ArrowRight size={16} />
        </Link>
      </section>
      {loading || planLoading ? (
        <div className="loading-panel">Cargando tu progreso…</div>
      ) : !user ? (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Tu progreso merece un espacio."
          text="Crea una cuenta para registrar tus sesiones y ver aquí tus avances reales."
          action={
            <Link href="/acceso?registro=1" className="button primary">
              Crear mi cuenta <ArrowRight size={16} />
            </Link>
          }
        />
      ) : (
        <>
          <section className="metrics-row progress-metrics">
            <div className="metric">
              <span className="metric-icon blush">
                <CalendarCheck2 size={21} />
              </span>
              <div>
                <span>Sesiones cumplidas</span>
                <strong>
                  {completed}
                  <small> / {totalSessions}</small>
                </strong>
              </div>
            </div>
            <div className="metric">
              <span className="metric-icon peach">
                <Dumbbell size={21} />
              </span>
              <div>
                <span>Series realizadas</span>
                <strong>
                  {totalSets}
                  <small> en tu programa</small>
                </strong>
              </div>
            </div>
            <div className="metric">
              <span className="metric-icon lavender">
                <Award size={21} />
              </span>
              <div>
                <span>Cumplimiento total</span>
                <strong>
                  {Math.round((completed / totalSessions) * 100)}
                  <small>% del programa</small>
                </strong>
              </div>
            </div>
          </section>
          <div className="charts-row">
            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <h2>Sesiones por semana</h2>
                  <p>
                    Tu objetivo en este plan: {planDays(plan, 1).length}{" "}
                    sesiones por semana.
                  </p>
                </div>
                <BarChart3 size={21} />
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chart}
                    margin={{ left: -20, right: 15, top: 12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#f0e9ee"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8b8290", fontSize: 12 }}
                    />
                    <YAxis
                      domain={[
                        0,
                        Math.max(
                          ...Array.from(
                            { length: plan.weeks },
                            (_, i) => planDays(plan, i + 1).length
                          )
                        ),
                      ]}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8b8290", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#fff4f8" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #f3dce6",
                        fontSize: 13,
                      }}
                    />
                    <Bar
                      dataKey="sesiones"
                      name="Sesiones completas"
                      fill={plan.color}
                      radius={[6, 6, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <h2>El trabajo que suma</h2>
                  <p>Series registradas, incluso en sesiones parciales.</p>
                </div>
                <Dumbbell size={21} />
              </div>
              <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chart}
                    margin={{ left: -15, right: 15, top: 12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#f0e9ee"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8b8290", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8b8290", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#fff4f8" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #f3dce6",
                        fontSize: 13,
                      }}
                    />
                    <Bar
                      dataKey="series"
                      name="Series realizadas"
                      fill={plan.color}
                      radius={[6, 6, 0, 0]}
                      barSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
          <section className="history-card">
            <div className="section-heading">
              <div>
                <h2>Tu historial de entrenamiento</h2>
                <p>
                  Se guarda cuando marcas una serie, un ejercicio o el cardio.
                </p>
              </div>
              <span className="tiny-pill">
                <Star size={12} /> {completed} ESTRELLAS
              </span>
            </div>
            {!history.length ? (
              <EmptyState
                icon={<Star size={24} />}
                title="La primera estrella te espera."
                text={
                  archivedSessions
                    ? "Esta versión todavía no tiene sesiones. Tus entrenamientos anteriores se conservan abajo, en el historial de versiones."
                    : "Completa tu primera sesión y verás aquí tu historial. No se muestran datos de ejemplo."
                }
                action={
                  <Link href="/entrenamiento" className="text-link">
                    Ir a mi entrenamiento →
                  </Link>
                }
              />
            ) : (
              <div className="history-list">
                {history.map(record => {
                  const match = /w(\d+)-d(\d)/.exec(record.dayKey)!;
                  const week = Number(match[1]);
                  const day = Number(match[2]);
                  const routine = planDays(plan, week).find(d => d.day === day);
                  return (
                    <Link
                      href={`/entrenamiento?semana=${week}&dia=${day}`}
                      className="history-row"
                      key={record.dayKey}
                    >
                      <span
                        className={`history-icon ${record.completedAt ? "complete" : ""}`}
                      >
                        {record.completedAt ? (
                          <Star size={20} fill="currentColor" />
                        ) : (
                          <Dumbbell size={20} />
                        )}
                      </span>
                      <div>
                        <strong>{routine?.focus ?? "Sesión registrada"}</strong>
                        <span>
                          Semana {week} ·{" "}
                          {dateLabel(dayDate(user.startDate, week, day), true)}
                        </span>
                      </div>
                      <span className="history-series">
                        {record.completedSets.length} series
                        {plan.mode === "supersets"
                          ? ` · cardio ${record.cardioDone ? "realizado" : "pendiente"}`
                          : " registradas"}
                      </span>
                      <span
                        className={`status-pill ${record.completedAt ? "complete" : "pending"}`}
                      >
                        {record.completedAt ? (
                          <>
                            <Check size={12} /> Cumplida
                          </>
                        ) : (
                          "En progreso"
                        )}
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
          {plan.isPersonal && (
            <section className="history-card" aria-label="Versiones anteriores de tu rutina">
              <div className="section-heading">
                <div>
                  <h2>Versiones anteriores de tu Plan Personal</h2>
                  <p>
                    Cada edición conserva los ejercicios, las fechas y las
                    series de su ciclo. Tus sesiones anteriores no se mezclan
                    con la rutina activa.
                  </p>
                </div>
                <Award size={21} />
              </div>
              {archivesLoading ? (
                <p className="measurement-note">Cargando versiones anteriores…</p>
              ) : archivesError ? (
                <p role="alert">{archivesError}</p>
              ) : !archives.length ? (
                <p className="measurement-note">
                  Todavía no hay versiones anteriores. Podés cambiar la rutina
                  desde Mis planes sin perder tus entrenamientos.
                </p>
              ) : (
                <>
                  <p className="measurement-note">
                    <strong>Historial acumulado:</strong>{" "}
                    {archivedSessions + completed} sesiones cumplidas y{" "}
                    {archivedSets + totalSets} series registradas entre todas
                    las versiones del Plan Personal.
                  </p>
                  <div className="history-list">
                    {archives.map(edition => {
                      const sessionCount = edition.progress.filter(
                        record => record.completedAt
                      ).length;
                      const isOpen = openArchive === edition.version;
                      const records = [...edition.progress]
                        .filter(record =>
                          record.completedSets.length ||
                          record.warmupDone ||
                          record.cardioDone
                        )
                        .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
                      return (
                        <div key={edition.version} className="history-card">
                          <button
                            type="button"
                            className="history-row"
                            aria-expanded={isOpen}
                            onClick={() =>
                              setOpenArchive(isOpen ? null : edition.version)
                            }
                          >
                            <span className="history-icon complete">
                              <Dumbbell size={19} />
                            </span>
                            <div>
                              <strong>Versión {edition.version}</strong>
                              <span>
                                Inicio: {dateLabel(edition.startDate, true)} ·
                                Archivada:{" "}
                                {new Date(edition.archivedAt).toLocaleDateString("es")}
                              </span>
                            </div>
                            <span className="history-series">
                              {sessionCount} sesiones · {records.length} registros
                            </span>
                            <ArrowRight size={16} />
                          </button>
                          {isOpen && (
                            <div className="history-list">
                              {records.length ? (
                                records.map(record => {
                                  const match = /^w(\d+)-d([1-7])$/.exec(record.dayKey);
                                  if (!match) return null;
                                  const week = Number(match[1]);
                                  const day = Number(match[2]);
                                  const originalDay = planDays(edition.plan, week)
                                    .find(item => item.day === day);
                                  return (
                                    <div className="history-row" key={record.dayKey}>
                                      <span className="history-icon">
                                        {record.completedAt
                                          ? <Star size={18} />
                                          : <Dumbbell size={18} />}
                                      </span>
                                      <div>
                                        <strong>
                                          {originalDay?.focus ?? "Sesión guardada"}
                                        </strong>
                                        <span>
                                          {dateLabel(dayDate(edition.startDate, week, day), true)}
                                          {" · "}
                                          {originalDay?.exercises.map(item => item.name).join(", ")}
                                        </span>
                                      </div>
                                      <span className="history-series">
                                        {record.completedSets.length} series ·{" "}
                                        {record.completedAt ? "Cumplida" : "Parcial"}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="measurement-note">
                                  Esta versión no tenía sesiones registradas.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
          <div className="measurement-note">
            <TrendingUp size={18} />
            <p>
              Estas gráficas muestran cumplimiento de entrenamiento, no pérdida
              de peso ni cambios corporales. El programa no estima calorías o
              resultados que no hayas medido.
            </p>
          </div>
        </>
      )}
    </FitLayout>
  );
}
