import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BellRing,
  Check,
  LockKeyhole,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { EmptyState } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import { LEVELS } from "@shared/routine";

export default function Settings() {
  const { user, loading, progress, updateProfile } = useFit();
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const submitProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      await updateProfile({
        fullName: data.get("fullName"),
        email: data.get("email"),
        level: data.get("level"),
        startDate: data.get("startDate") ?? user?.startDate,
        reminderTime: data.get("reminderTime"),
        remindersEnabled: data.get("remindersEnabled") === "on",
        timezone: data.get("timezone"),
      });
      toast.success("Tu cuenta y tus preferencias están guardadas.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const changePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setPasswordError("Las nuevas contraseñas no coinciden.");
      setPasswordBusy(false);
      return;
    }
    try {
      await api("/password", {
        method: "POST",
        body: {
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        },
      });
      form.reset();
      toast.success("Contraseña actualizada. Las otras sesiones se cerraron.");
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setPasswordBusy(false);
    }
  };
  return (
    <FitLayout title="Mi cuenta">
      <section className="page-intro">
        <div>
          <span className="eyebrow">ORGANÍZALO PARA QUE FUNCIONE PARA TI</span>
          <h1>Tu espacio, tus preferencias.</h1>
          <p>Ajusta tu cuenta y haz lugar para tu entrenamiento.</p>
        </div>
      </section>
      {loading ? (
        <div className="loading-panel">Cargando tu cuenta…</div>
      ) : !user ? (
        <EmptyState
          icon={<Settings2 size={28} />}
          title="Primero, crea tu espacio."
          text="Necesitas una cuenta para guardar tu nivel, tu horario y el avance de cada sesión."
          action={
            <Link href="/acceso?registro=1" className="button primary">
              Crear mi cuenta <ArrowRight size={16} />
            </Link>
          }
        />
      ) : (
        <div className="settings-grid">
          <form
            className="settings-card"
            onSubmit={submitProfile}
            key={user.id}
          >
            <div className="section-heading">
              <div>
                <h2>Mi perfil y mi programa</h2>
                <p>
                  Tu usuario es <strong>@{user.username}</strong>.
                </p>
              </div>
              <span className="metric-icon blush">
                <Settings2 size={20} />
              </span>
            </div>
            <div className="form-two-columns">
              <label>
                Nombre completo
                <input
                  name="fullName"
                  defaultValue={user.fullName}
                  minLength={2}
                  maxLength={80}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                Correo electrónico
                <input
                  name="email"
                  defaultValue={user.email}
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Mi nivel
                <select name="level" defaultValue={user.level}>
                  {Object.entries(LEVELS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                <small>
                  Termina las sesiones parciales antes de cambiar de nivel. Tu
                  historial cumplido conserva el nivel anterior.
                </small>
              </label>
              <label>
                Inicio del programa
                <input
                  name="startDate"
                  type="date"
                  defaultValue={user.startDate}
                  disabled={progress.length > 0}
                  required
                />
                <small>
                  {progress.length
                    ? "La fecha permanece fija para conservar tu historial."
                    : "Elige un lunes para mantener el calendario del PDF."}
                </small>
              </label>
            </div>
            <div className="settings-divider" />
            <div className="section-heading">
              <div>
                <h2>Un horario para ti</h2>
                <p>Los pendientes se calculan según tu zona horaria.</p>
              </div>
              <BellRing size={20} />
            </div>
            <div className="form-two-columns">
              <label>
                Hora del recordatorio
                <input
                  type="time"
                  name="reminderTime"
                  defaultValue={user.reminderTime}
                  required
                />
              </label>
              <label>
                Zona horaria
                <input name="timezone" defaultValue={user.timezone} required />
                <small>
                  Ejemplo: America/Santiago. Se detecta al crear tu cuenta.
                </small>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="remindersEnabled"
                defaultChecked={user.remindersEnabled}
              />
              <span>
                <strong>Mostrar recordatorios de rutina atrasada</strong>
                <small>
                  Si pasa el horario y la sesión no está completa, aparecerá
                  como pendiente.
                </small>
              </span>
            </label>
            <div className="reminder-scope">
              <BellRing size={15} />
              <p>
                Los recordatorios se muestran dentro de Ritmo Fit al abrir la
                app. Esta versión no envía correos ni notificaciones push cuando
                está cerrada.
              </p>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary" disabled={busy}>
              <Save size={16} />
              {busy ? "Guardando…" : "Guardar preferencias"}
            </button>
          </form>
          <div className="settings-side">
            <form className="settings-card" onSubmit={changePassword}>
              <div className="section-heading">
                <div>
                  <h2>Tu seguridad</h2>
                  <p>Cambia tu contraseña cuando lo necesites.</p>
                </div>
                <LockKeyhole size={21} />
              </div>
              <label>
                Contraseña actual
                <input
                  type="password"
                  name="currentPassword"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  name="newPassword"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
                <small>Al menos 10 caracteres. Usa una contraseña única.</small>
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  name="confirmPassword"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </label>
              {passwordError && (
                <div className="form-error" role="alert">
                  {passwordError}
                </div>
              )}
              <button className="button secondary full" disabled={passwordBusy}>
                <Check size={16} />
                {passwordBusy ? "Actualizando…" : "Actualizar contraseña"}
              </button>
            </form>
            <section className="privacy-card">
              <ShieldCheck size={23} />
              <h3>Un seguimiento privado.</h3>
              <p>
                Tu cuenta solo puede consultar sus propios registros. El
                administrador del programa puede ver tu cumplimiento para
                acompañarte.
              </p>
              <p>
                Las contraseñas no se guardan ni se muestran en texto plano.
              </p>
              {user.role === "admin" && (
                <Link href="/admin" className="text-link">
                  Abrir administración <ArrowRight size={14} />
                </Link>
              )}
            </section>
          </div>
        </div>
      )}
    </FitLayout>
  );
}
