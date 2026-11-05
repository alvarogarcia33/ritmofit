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
import { dateLabel, dayDate } from "@/lib/fit";
import { ROUTINE } from "@shared/routine";

export default function ProgressPage() {
  const { user, loading, progress } = useFit();
  const completed = progress.filter(p => p.completedAt).length;
  const totalSets = progress.reduce(
    (sum, p) => sum + p.completedSets.length,
    0
  );
  const chart = [1, 2, 3, 4].map(week => ({
    name: `Semana ${week}`,
    sesiones: progress.filter(
      p => p.dayKey.startsWith(`w${week}-`) && p.completedAt
    ).length,
    series: progress
      .filter(p => p.dayKey.startsWith(`w${week}-`))
      .reduce((sum, p) => sum + p.completedSets.length, 0),
  }));
  const history = [...progress]
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .filter(p => p.completedSets.length || p.cardioDone || p.warmupDone);
  return (
    <FitLayout title="Mi progreso">
      <section className="page-intro">
        <div>
          <span className="eyebrow">ESTO LO ESTÁS CONSTRUYENDO TÚ</span>
          <h1>Tu constancia se ve.</h1>
          <p>No solo números. Cada registro es algo que hiciste por ti.</p>
        </div>
        <Link className="button secondary" href="/">
          Volver a entrenar <ArrowRight size={16} />
        </Link>
      </section>
      {loading ? (
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
                  <small> / 24</small>
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
                  {Math.round((completed / 24) * 100)}
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
                  <p>Tu objetivo: 6 sesiones cada semana.</p>
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
                      domain={[0, 6]}
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
                      fill="#e9387a"
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
                      fill="#ef9cbc"
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
                text="Completa tu primera sesión y verás aquí tu historial. No se muestran datos de ejemplo."
                action={
                  <Link href="/" className="text-link">
                    Ir a mi entrenamiento →
                  </Link>
                }
              />
            ) : (
              <div className="history-list">
                {history.map(record => {
                  const match = /w(\d)-d(\d)/.exec(record.dayKey)!;
                  const week = Number(match[1]);
                  const day = Number(match[2]);
                  const routine = ROUTINE[week <= 2 ? "first" : "second"].find(
                    d => d.day === day
                  )!;
                  return (
                    <Link
                      href={`/?semana=${week}&dia=${day}`}
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
                        <strong>{routine.focus}</strong>
                        <span>
                          Semana {week} ·{" "}
                          {dateLabel(dayDate(user.startDate, week, day), true)}
                        </span>
                      </div>
                      <span className="history-series">
                        {record.completedSets.length} series · cardio{" "}
                        {record.cardioDone ? "realizado" : "pendiente"}
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
