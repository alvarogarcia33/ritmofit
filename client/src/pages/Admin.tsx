import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  ExternalLink,
  FilePenLine,
  LockKeyhole,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Video,
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
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import {
  api,
  dateLabel,
  dayDate,
  type ContentOverride,
  type FitUser,
  type Progress,
} from "@/lib/fit";
import { ROUTINE, type RoutineDay } from "@shared/routine";
import "../admin.css";

type UserDetail = { user: FitUser; progress: Progress[] };
type ContentForm = Pick<ContentOverride, "name" | "videoUrl" | "tips">;
type DailyHistory = {
  key: string;
  week: number;
  day: number;
  date: string;
  label: string;
  status: "completada" | "parcial" | "sin-registro";
  sets: number;
  cardio: boolean;
  updatedAt: string | null;
};

const EMPTY_FORM: ContentForm = { name: "", videoUrl: "", tips: "" };
const DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export default function Admin() {
  const { user, loading } = useFit();

  return (
    <FitLayout title="Administración">
      {loading ? (
        <AdminLoading />
      ) : !user ? (
        <LoginRequired />
      ) : user.role !== "admin" ? (
        <Restricted />
      ) : (
        <AdminWorkspace />
      )}
    </FitLayout>
  );
}

function AdminWorkspace() {
  const { overrides, refreshContent } = useFit();
  const [activeTab, setActiveTab] = useState<"users" | "content">("users");
  const [users, setUsers] = useState<FitUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
  const [block, setBlock] = useState(1);
  const [exerciseId, setExerciseId] = useState(
    ROUTINE.first[0].exercises[0].id
  );
  const [contentForm, setContentForm] = useState<ContentForm>(EMPTY_FORM);
  const [savingContent, setSavingContent] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState(false);

  const isAdmin = true;

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const result = await api<{ users: FitUser[] }>("/admin/users");
      setUsers(result.users);
      setSelectedUserId(current => current ?? result.users[0]?.id ?? null);
    } catch (error) {
      setUsersError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la lista de usuarios."
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      await refreshContent();
    } catch (error) {
      setContentError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el contenido."
      );
    } finally {
      setContentLoading(false);
    }
  }, [refreshContent]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
    void loadContent();
  }, [isAdmin, loadContent, loadUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    api<UserDetail>(`/admin/users/${selectedUserId}`)
      .then(result => {
        if (!cancelled) setSelectedDetail(result);
      })
      .catch(error => {
        if (!cancelled) {
          setSelectedDetail(null);
          setDetailError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el detalle del usuario."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailReload, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(item =>
      [item.fullName, item.username, item.email].some(value =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search, users]);

  const routineDays = useMemo<RoutineDay[]>(
    () => ROUTINE[week <= 2 ? "first" : "second"],
    [week]
  );
  const selectedDay =
    routineDays.find(item => item.day === day) ?? routineDays[0];
  const blockExercises = selectedDay.exercises.filter(
    item => item.block === block
  );
  const selectedExercise =
    blockExercises.find(item => item.id === exerciseId) ?? blockExercises[0];
  const selectedOverride = selectedExercise
    ? overrides.find(item => item.exerciseId === selectedExercise.id)
    : undefined;

  useEffect(() => {
    if (selectedExercise && selectedExercise.id !== exerciseId)
      setExerciseId(selectedExercise.id);
  }, [exerciseId, selectedExercise]);

  useEffect(() => {
    if (!selectedExercise) return;
    setContentForm({
      name: selectedOverride?.name ?? selectedExercise.name,
      videoUrl: selectedOverride?.videoUrl ?? selectedExercise.videoUrl,
      tips: selectedOverride?.tips ?? selectedExercise.tips,
    });
    setSaveError(null);
    setSavedContent(false);
  }, [
    selectedExercise?.id,
    selectedExercise?.name,
    selectedExercise?.videoUrl,
    selectedExercise?.tips,
    selectedOverride?.name,
    selectedOverride?.videoUrl,
    selectedOverride?.tips,
  ]);

  const handleSaveContent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedExercise) return;
    setSavingContent(true);
    setSaveError(null);
    setSavedContent(false);
    try {
      await api<{ success: true }>(
        `/admin/content/${encodeURIComponent(selectedExercise.id)}`,
        {
          method: "PUT",
          body: contentForm,
        }
      );
      await refreshContent();
      setSavedContent(true);
      toast.success("Contenido actualizado.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el contenido."
      );
    } finally {
      setSavingContent(false);
    }
  };

  const selectedUser =
    selectedDetail?.user ??
    users.find(item => item.id === selectedUserId) ??
    null;
  const selectedProgress = selectedDetail?.progress ?? [];
  const completedSessions = selectedProgress.filter(item =>
    Boolean(item.completedAt)
  ).length;
  const recordedSets = selectedProgress.reduce(
    (total, item) => total + item.completedSets.length,
    0
  );
  const activeAccounts = users.filter(item => Boolean(item.lastLogin)).length;

  return (
    <div className="admin-page">
      <section className="page-intro admin-intro">
        <div>
          <span className="eyebrow">PANEL DE CONTROL</span>
          <h1>
            Administración{" "}
            <span className="admin-title-mark">
              <ShieldCheck size={22} />
            </span>
          </h1>
          <p>
            Seguimiento real de la constancia y del contenido original de Ritmo
            Fit.
          </p>
        </div>
        <div className="admin-intro-badge">
          <CheckCircle2 size={17} />
          <span>Acceso de administrador</span>
        </div>
      </section>

      <div className="admin-original-note">
        <BookOpen size={19} />
        <div>
          <strong>Las instrucciones originales permanecen.</strong>
          <span>
            Este panel solo edita nombre, video y tips de ejercicios ya
            existentes en el PDF. No crea rutinas ni cambia niveles, series u
            orden.
          </span>
        </div>
        <a
          className="text-link"
          href="/programa-perdida-de-peso.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Abrir PDF original <ExternalLink size={14} />
        </a>
      </div>

      <div
        className="admin-tabs"
        role="tablist"
        aria-label="Secciones de administración"
      >
        <button
          role="tab"
          aria-selected={activeTab === "users"}
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          <Users size={17} /> Usuarios
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "content"}
          className={activeTab === "content" ? "active" : ""}
          onClick={() => setActiveTab("content")}
        >
          <FilePenLine size={17} /> Contenido
        </button>
      </div>

      {activeTab === "users" ? (
        <>
          <section className="admin-metrics" aria-label="Métricas reales">
            <Metric
              icon={<Users size={19} />}
              label="Total registrados"
              value={usersLoading ? "…" : String(users.length)}
              note="cuentas en el sistema"
              tone="pink"
            />
            <Metric
              icon={<Clock3 size={19} />}
              label="Con acceso registrado"
              value={usersLoading ? "…" : String(activeAccounts)}
              note="según último acceso"
              tone="peach"
            />
            <Metric
              icon={<CheckCircle2 size={19} />}
              label="Sesiones completadas"
              value={
                detailLoading
                  ? "…"
                  : selectedDetail
                    ? String(completedSessions)
                    : "—"
              }
              note={
                selectedDetail
                  ? "usuario seleccionado"
                  : "selecciona un usuario"
              }
              tone="lavender"
            />
            <Metric
              icon={<BarChart3 size={19} />}
              label="Series registradas"
              value={
                detailLoading
                  ? "…"
                  : selectedDetail
                    ? String(recordedSets)
                    : "—"
              }
              note={
                selectedDetail
                  ? "usuario seleccionado"
                  : "selecciona un usuario"
              }
              tone="mint"
            />
          </section>

          <div className="admin-users-layout">
            <section className="admin-card admin-users-card">
              <div className="admin-card-heading">
                <div>
                  <span className="eyebrow">DIRECTORIO</span>
                  <h2>Personas registradas</h2>
                </div>
                <span className="admin-count">
                  {filteredUsers.length}{" "}
                  {filteredUsers.length === 1 ? "resultado" : "resultados"}
                </span>
              </div>
              <label className="admin-search">
                <Search size={17} />
                <span className="sr-only">Buscar usuario</span>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, usuario o email"
                />
              </label>
              {usersLoading ? (
                <LoadingRows />
              ) : usersError ? (
                <ErrorState
                  message={usersError}
                  onRetry={() => void loadUsers()}
                />
              ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <Users size={23} />
                  <strong>
                    {users.length
                      ? "No encontramos coincidencias"
                      : "Todavía no hay usuarios"}
                  </strong>
                  <span>
                    {users.length
                      ? "Prueba con otro nombre, usuario o correo."
                      : "Las cuentas registradas aparecerán aquí."}
                  </span>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Nivel</th>
                        <th>Inicio</th>
                        <th>Último acceso</th>
                        <th>
                          <span className="sr-only">Seleccionar</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(item => (
                        <tr
                          key={item.id}
                          className={
                            item.id === selectedUserId ? "selected" : ""
                          }
                          onClick={() => setSelectedUserId(item.id)}
                        >
                          <td>
                            <div className="admin-user-cell">
                              <span className="admin-user-avatar">
                                {initials(item.fullName)}
                              </span>
                              <span>
                                <strong>{item.fullName}</strong>
                                <small>
                                  @{item.username} · {item.email}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="level-badge">
                              {levelLabel(item.level)}
                            </span>
                          </td>
                          <td>{formatDate(item.startDate)}</td>
                          <td>
                            {item.lastLogin ? (
                              formatDateTime(item.lastLogin)
                            ) : (
                              <span className="muted">Sin acceso</span>
                            )}
                          </td>
                          <td>
                            <ChevronRight size={17} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <UserDetailPanel
              detail={selectedDetail}
              selectedUser={selectedUser}
              loading={detailLoading}
              error={detailError}
              onRetry={() => setDetailReload(current => current + 1)}
            />
          </div>
        </>
      ) : (
        <section className="admin-content-grid">
          <section className="admin-card admin-content-picker">
            <div className="admin-card-heading">
              <div>
                <span className="eyebrow">CATÁLOGO ORIGINAL</span>
                <h2>Selecciona un ejercicio</h2>
              </div>
              <BookOpen size={20} className="admin-heading-icon" />
            </div>
            {contentLoading ? (
              <AdminLoading compact />
            ) : contentError ? (
              <ErrorState
                message={contentError}
                onRetry={() => void loadContent()}
              />
            ) : (
              <>
                <div className="admin-selector-grid">
                  <label>
                    Semana
                    <select
                      value={week}
                      onChange={event => {
                        setWeek(Number(event.target.value));
                        setDay(1);
                        setBlock(1);
                      }}
                    >
                      <option value={1}>Semana 1 · Primera rutina</option>
                      <option value={2}>Semana 2 · Primera rutina</option>
                      <option value={3}>Semana 3 · Segunda rutina</option>
                      <option value={4}>Semana 4 · Segunda rutina</option>
                    </select>
                  </label>
                  <label>
                    Día
                    <select
                      value={day}
                      onChange={event => setDay(Number(event.target.value))}
                    >
                      {routineDays.map(item => (
                        <option key={item.day} value={item.day}>
                          {item.label} · {item.focus}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Bloque
                    <select
                      value={block}
                      onChange={event => setBlock(Number(event.target.value))}
                    >
                      <option value={1}>Bloque 1 · Base</option>
                      <option value={2}>Bloque 2 · Intermedio</option>
                      <option value={3}>Bloque 3 · Avanzado</option>
                    </select>
                  </label>
                  <label>
                    Ejercicio
                    <select
                      value={selectedExercise?.id ?? ""}
                      onChange={event => setExerciseId(event.target.value)}
                    >
                      {selectedDay.exercises
                        .filter(item => item.block === block)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {selectedExercise && (
                  <div className="admin-selection-summary">
                    <span className="admin-exercise-index">
                      {selectedExercise.id}
                    </span>
                    <div>
                      <strong>{selectedExercise.name}</strong>
                      <span>
                        {selectedDay.label} · {selectedDay.focus} · Bloque{" "}
                        {selectedExercise.block}
                      </span>
                    </div>
                    <a
                      href={contentForm.videoUrl || selectedExercise.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir video de ${selectedExercise.name}`}
                    >
                      <Video size={16} /> Ver video <ExternalLink size={13} />
                    </a>
                  </div>
                )}
                <div className="admin-content-rule">
                  <AlertCircle size={16} />
                  <span>
                    El selector usa únicamente ejercicios existentes en las
                    rutinas primera y segunda del PDF.
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="admin-card admin-content-editor">
            <div className="admin-card-heading">
              <div>
                <span className="eyebrow">EDICIÓN LIMITADA</span>
                <h2>Datos publicados</h2>
              </div>
              <FilePenLine size={20} className="admin-heading-icon" />
            </div>
            {contentLoading ? (
              <AdminLoading compact />
            ) : contentError ? (
              <div className="empty-state">
                <AlertCircle size={23} />
                <strong>Contenido no disponible</strong>
                <span>Carga el catálogo para editar un ejercicio.</span>
              </div>
            ) : !selectedExercise ? (
              <div className="empty-state">
                <FilePenLine size={23} />
                <strong>Selecciona un ejercicio</strong>
                <span>Elige un ejercicio existente para comenzar.</span>
              </div>
            ) : (
              <form className="admin-editor-form" onSubmit={handleSaveContent}>
                <label>
                  Nombre del ejercicio
                  <input
                    required
                    minLength={2}
                    maxLength={140}
                    value={contentForm.name}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  URL del video{" "}
                  <span className="label-hint">HTTPS de Vimeo</span>
                  <input
                    required
                    type="url"
                    value={contentForm.videoUrl}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        videoUrl: event.target.value,
                      }))
                    }
                    placeholder="https://vimeo.com/…"
                  />
                </label>
                <label>
                  Tips para la técnica
                  <textarea
                    required
                    maxLength={2000}
                    rows={7}
                    value={contentForm.tips}
                    onChange={event =>
                      setContentForm(current => ({
                        ...current,
                        tips: event.target.value,
                      }))
                    }
                  />
                  <span className="field-counter">
                    {contentForm.tips.length}/2000
                  </span>
                </label>
                {saveError && (
                  <div className="form-error" role="alert">
                    <AlertCircle size={16} />
                    {saveError}
                  </div>
                )}
                {savedContent && (
                  <div className="form-success" role="status">
                    <Check size={16} />
                    Cambios guardados en el backend.
                  </div>
                )}
                <div className="admin-form-actions">
                  <button
                    className="button secondary"
                    type="button"
                    disabled={savingContent}
                    onClick={() => {
                      if (!selectedExercise) return;
                      setContentForm({
                        name: selectedOverride?.name ?? selectedExercise.name,
                        videoUrl:
                          selectedOverride?.videoUrl ??
                          selectedExercise.videoUrl,
                        tips: selectedOverride?.tips ?? selectedExercise.tips,
                      });
                      setSaveError(null);
                      setSavedContent(false);
                    }}
                  >
                    Restaurar datos cargados
                  </button>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={savingContent}
                  >
                    {savingContent ? "Guardando…" : "Guardar cambios"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            )}
          </section>
        </section>
      )}
    </div>
  );
}

function UserDetailPanel({
  detail,
  selectedUser,
  loading,
  error,
  onRetry,
}: {
  detail: UserDetail | null;
  selectedUser: FitUser | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const progress = detail?.progress ?? [];
  const weeklyData = [1, 2, 3, 4].map(week => {
    const completed = progress.filter(
      item => item.dayKey.startsWith(`w${week}-`) && Boolean(item.completedAt)
    ).length;
    return {
      week: `Semana ${week}`,
      completed,
      percent: Math.round((completed / 6) * 100),
    };
  });
  const dailyData = [1, 2, 3, 4].flatMap(week =>
    [1, 2, 3, 4, 5, 6].map(day => {
      const record = progress.find(item => item.dayKey === `w${week}-d${day}`);
      return {
        day: `S${week} D${day}`,
        series: record?.completedSets.length ?? 0,
      };
    })
  );
  const history = selectedUser ? buildHistory(selectedUser, progress) : [];
  const completedCount = progress.filter(item =>
    Boolean(item.completedAt)
  ).length;
  const partialCount = progress.filter(
    item =>
      !item.completedAt &&
      (item.completedSets.length > 0 || item.cardioDone || item.warmupDone)
  ).length;

  return (
    <section className="admin-card admin-detail-card">
      <div className="admin-card-heading">
        <div>
          <span className="eyebrow">SEGUIMIENTO</span>
          <h2>
            {selectedUser ? selectedUser.fullName : "Detalle del usuario"}
          </h2>
        </div>
        {selectedUser && (
          <span className="level-badge">{levelLabel(selectedUser.level)}</span>
        )}
      </div>
      {loading ? (
        <AdminLoading compact />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !selectedUser ? (
        <div className="empty-state">
          <CircleUserRound size={23} />
          <strong>Selecciona una fila</strong>
          <span>Verás métricas y progreso real del usuario aquí.</span>
        </div>
      ) : !detail ? (
        <div className="empty-state">
          <CircleUserRound size={23} />
          <strong>Sin detalle disponible</strong>
          <span>Selecciona de nuevo al usuario para consultar sus datos.</span>
        </div>
      ) : (
        <>
          <div className="detail-user-meta">
            <span>
              <UserRound size={14} /> @{selectedUser.username}
            </span>
            <span>
              <Mail size={14} /> {selectedUser.email}
            </span>
            <span>Inicio: {formatDate(selectedUser.startDate)}</span>
          </div>
          <div className="detail-summary">
            <div>
              <strong>{completedCount}</strong>
              <span>completadas</span>
            </div>
            <div>
              <strong>{partialCount}</strong>
              <span>parciales</span>
            </div>
            <div>
              <strong>
                {progress.reduce(
                  (sum, item) => sum + item.completedSets.length,
                  0
                )}
              </strong>
              <span>series</span>
            </div>
          </div>
          <div className="admin-chart-block">
            <div className="chart-heading">
              <div>
                <h3>Cumplimiento por semana</h3>
                <span>Sesiones completadas reales · 6 días por semana</span>
              </div>
              <BarChart3 size={18} />
            </div>
            <div className="admin-chart">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={weeklyData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="#f0dce5" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#7b7180" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={value => `${value}%`}
                    tick={{ fontSize: 11, fill: "#7b7180" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Cumplimiento"]}
                    cursor={{ fill: "#fff4f8" }}
                  />
                  <Bar
                    dataKey="percent"
                    fill="#e9387a"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="admin-chart-block">
            <div className="chart-heading">
              <div>
                <h3>Series realizadas por día</h3>
                <span>Conteo guardado en cada registro del programa</span>
              </div>
              <BarChart3 size={18} />
            </div>
            <div className="admin-chart">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart
                  data={dailyData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="#f0dce5" />
                  <XAxis
                    dataKey="day"
                    interval={3}
                    tick={{ fontSize: 10, fill: "#7b7180" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#7b7180" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "#e9387a", strokeDasharray: "3 3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="series"
                    name="Series"
                    stroke="#b35be0"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#b35be0", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="admin-history">
            <div className="chart-heading">
              <div>
                <h3>Historial diario</h3>
                <span>
                  Estado calculado con el progreso guardado, sin datos de
                  demostración
                </span>
              </div>
              <Clock3 size={18} />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table history-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Series</th>
                    <th>Cardio</th>
                    <th>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.key}>
                      <td>
                        <strong>
                          S{item.week} · D{item.day}
                        </strong>
                        <small>{item.label}</small>
                      </td>
                      <td>{formatDate(item.date)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{item.sets}</td>
                      <td>
                        {item.cardio ? (
                          <CheckCircle2 size={16} className="history-check" />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.updatedAt ? (
                          formatDateTime(item.updatedAt)
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="admin-metric">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DailyHistory["status"] }) {
  const labels: Record<DailyHistory["status"], string> = {
    completada: "Completada",
    parcial: "Parcial",
    "sin-registro": "Sin registro",
  };
  return (
    <span className={`status-badge ${status}`}>
      {status === "completada" ? (
        <CheckCircle2 size={13} />
      ) : status === "parcial" ? (
        <Clock3 size={13} />
      ) : (
        <span className="status-dot" />
      )}
      {labels[status]}
    </span>
  );
}

function buildHistory(user: FitUser, progress: Progress[]): DailyHistory[] {
  return [1, 2, 3, 4].flatMap(week =>
    [1, 2, 3, 4, 5, 6].map(day => {
      const key = `w${week}-d${day}`;
      const record = progress.find(item => item.dayKey === key);
      const hasActivity = Boolean(
        record &&
          (record.completedSets.length ||
            record.cardioDone ||
            record.warmupDone)
      );
      return {
        key,
        week,
        day,
        date: dayDate(user.startDate, week, day),
        label: DAY_LABELS[day - 1],
        status: record?.completedAt
          ? "completada"
          : hasActivity
            ? "parcial"
            : "sin-registro",
        sets: record?.completedSets.length ?? 0,
        cardio: Boolean(record?.cardioDone),
        updatedAt: record?.updatedAt ?? null,
      };
    })
  );
}

function AdminLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`admin-loading ${compact ? "compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <RefreshCw size={compact ? 18 : 22} className="spin" />
      <span>Cargando datos reales…</span>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="admin-loading-rows" role="status" aria-live="polite">
      {[1, 2, 3, 4].map(item => (
        <div key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="admin-error" role="alert">
      <AlertCircle size={21} />
      <div>
        <strong>No se pudo cargar esta sección</strong>
        <span>{message}</span>
        <button className="text-link" onClick={onRetry}>
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <section className="admin-gate">
      <span className="admin-gate-icon">
        <LockKeyhole size={24} />
      </span>
      <span className="eyebrow">ACCESO REQUERIDO</span>
      <h1>Inicia sesión para continuar.</h1>
      <p>La administración está disponible solo para cuentas autorizadas.</p>
      <Link href="/acceso" className="button primary">
        Ir a acceso <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function Restricted() {
  return (
    <section className="admin-gate">
      <span className="admin-gate-icon">
        <ShieldCheck size={24} />
      </span>
      <span className="eyebrow">ÁREA RESTRINGIDA</span>
      <h1>No tienes permisos de administración.</h1>
      <p>
        Tu cuenta puede seguir usando tu programa, pero este espacio está
        reservado para el rol administrador.
      </p>
      <Link href="/" className="button secondary">
        Volver a mi entrenamiento <ArrowRight size={16} />
      </Link>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function levelLabel(level: FitUser["level"]) {
  return level === "beginner"
    ? "Principiante"
    : level === "intermediate"
      ? "Intermedio"
      : "Avanzado";
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", { day: "numeric", month: "short" });
}
