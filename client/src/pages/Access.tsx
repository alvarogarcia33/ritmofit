import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/FitLayout";
import { useFit } from "@/contexts/FitContext";
import { nextMonday } from "@/lib/fit";
import { LEVELS, type Level } from "@shared/routine";

export default function Access() {
  const [, navigate] = useLocation();
  const { authenticate } = useFit();
  const [register, setRegister] = useState(
    new URLSearchParams(window.location.search).get("registro") === "1"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [startDate, setStartDate] = useState(nextMonday());
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await authenticate(register ? "/register" : "/login", {
        username: form.get("username"),
        password: form.get("password"),
        ...(register
          ? {
              fullName: form.get("fullName"),
              email: form.get("email"),
              level,
              startDate,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : {}),
      });
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="access-page">
      <div className="access-brand">
        <Brand />
        <Link href="/" className="text-link">
          <ArrowLeft size={15} /> Volver al programa
        </Link>
      </div>
      <main className="access-main">
        <section className="access-story">
          <span className="tiny-pill">
            <Sparkles size={14} /> TU MEJOR VERSIÓN, A TU RITMO
          </span>
          <h1>
            No se trata de
            <br />
            hacerlo perfecto.
            <br />
            <em>
              Se trata de
              <br />
              seguir.
            </em>
          </h1>
          <p>
            Tu programa. Tus pequeños logros.
            <br />
            Un espacio para ver todo lo que estás construyendo.
          </p>
          <div className="access-benefits">
            <span>
              <Check size={16} /> Rutina original de 4 semanas
            </span>
            <span>
              <Check size={16} /> Videos paso a paso
            </span>
            <span>
              <Check size={16} /> Progreso guardado solo para ti
            </span>
          </div>
          <div className="access-quote">
            “La constancia le gana
            <br />
            al perfeccionismo.”<small>TU PROGRAMA PÉRDIDA DE PESO</small>
          </div>
        </section>
        <section className="access-form-panel">
          <div className="access-tabs">
            <button
              className={!register ? "selected" : ""}
              onClick={() => {
                setRegister(false);
                setError("");
              }}
            >
              Iniciar sesión
            </button>
            <button
              className={register ? "selected" : ""}
              onClick={() => {
                setRegister(true);
                setError("");
              }}
            >
              Crear cuenta
            </button>
          </div>
          <h2>
            {register
              ? "Tu cambio empieza contigo."
              : "Qué bueno verte de nuevo."}
          </h2>
          <p>
            {register
              ? "Crea tu espacio y empecemos a tu ritmo."
              : "Retoma justo donde lo dejaste."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Nombre completo
                  <input
                    name="fullName"
                    placeholder="¿Cómo te llamas?"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Correo electrónico
                  <input
                    type="email"
                    name="email"
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    required
                  />
                </label>
              </>
            )}
            <label>
              Usuario
              <input
                name="username"
                placeholder="Tu nombre de usuario"
                autoComplete="username"
                minLength={register ? 3 : 1}
                maxLength={30}
                pattern={register ? "[A-Za-z0-9_]+" : undefined}
                required
              />
              <small>
                {register
                  ? "3–30 caracteres. Letras, números y guion bajo."
                  : ""}
              </small>
            </label>
            <label>
              Contraseña
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={
                    register ? "Al menos 10 caracteres" : "Tu contraseña"
                  }
                  minLength={register ? 10 : 1}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {register && (
              <>
                <label>
                  Tu punto de partida
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as Level)}
                  >
                    {Object.entries(LEVELS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de inicio
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                  <small>
                    El programa sigue lunes a sábado. Elige un lunes para
                    mantener el split original.
                  </small>
                </label>
                <p className="privacy-note">
                  Tus registros serán privados y podrán ser consultados por el
                  administrador del programa para dar seguimiento.
                </p>
              </>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Conectando…"
                : register
                  ? "Crear mi cuenta"
                  : "Entrar a mi espacio"}
              <ArrowRight size={17} />
            </button>
          </form>
          <span className="secure-caption">
            <LockKeyhole size={13} /> Tu progreso se guarda de forma segura.
          </span>
          <p className="access-switch">
            {register ? "¿Ya tienes un espacio?" : "¿Aún no tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Inicia sesión" : "Crea tu cuenta"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
