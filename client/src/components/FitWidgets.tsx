import { useEffect, useRef, useState } from "react";
import {
  Dumbbell,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Star,
  Timer,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Exercise } from "@shared/routine";
import { getVideoEmbedUrl } from "@shared/video";
import { YouTubeVideo } from "./YouTubeVideo";

export function TimerCard({
  restSeconds,
  cardioMinutes,
  onCardioComplete,
  exerciseSeconds,
  exerciseLabel,
}: {
  restSeconds: number;
  cardioMinutes: number;
  onCardioComplete?: () => void;
  exerciseSeconds?: number;
  exerciseLabel?: string;
}) {
  const [mode, setMode] = useState<"rest" | "cardio" | "exercise">("rest");
  const initial =
    mode === "rest"
      ? restSeconds
      : mode === "exercise"
        ? (exerciseSeconds ?? 45)
        : cardioMinutes * 60;
  useEffect(() => {
    if (exerciseSeconds) setMode("exercise");
  }, [exerciseSeconds, exerciseLabel]);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    setRemaining(initial);
    setRunning(false);
    setFinished(false);
  }, [initial, mode]);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000)
      );
      setRemaining(next);
      if (!next) {
        setRunning(false);
        setFinished(true);
      }
    };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [running]);
  const toggle = () => {
    if (!running) {
      deadline.current = Date.now() + (remaining || initial) * 1000;
      if (!remaining) setRemaining(initial);
      setFinished(false);
    }
    setRunning(!running);
  };
  return (
    <section className="timer-card">
      <div className="section-small-title">
        <Timer size={17} />
        <h3>Tu pausa también cuenta</h3>
      </div>
      <div className="timer-tabs">
        <button
          className={mode === "rest" ? "selected" : ""}
          onClick={() => setMode("rest")}
        >
          Descanso
        </button>
        {cardioMinutes > 0 && (
          <button
            className={mode === "cardio" ? "selected" : ""}
            onClick={() => setMode("cardio")}
          >
            Cardio
          </button>
        )}
        {exerciseSeconds && (
          <button
            className={mode === "exercise" ? "selected" : ""}
            onClick={() => setMode("exercise")}
          >
            {exerciseLabel ?? "Ejercicio"}
          </button>
        )}
      </div>
      <div className={`timer-value ${running ? "ticking" : ""}`}>
        {String(Math.floor(remaining / 60)).padStart(2, "0")}
        <span>:</span>
        {String(remaining % 60).padStart(2, "0")}
      </div>
      <p className="timer-hint">
        {finished
          ? "Tiempo cumplido. ¿Lista para seguir?"
          : mode === "rest"
            ? "Entre series o ejercicios. Respira e hidrátate."
            : mode === "exercise"
              ? "Controla tu postura. Al terminar, marca tu serie."
              : "Usa una intensidad adecuada para ti."}
      </p>
      <div className="timer-actions">
        <button className="button secondary timer-start" onClick={toggle}>
          {running ? (
            <Pause size={14} />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
          {running
            ? "Pausar"
            : remaining !== initial && remaining > 0
              ? "Continuar"
              : "Iniciar"}
        </button>
        <button
          className="icon-button reset-timer"
          aria-label="Reiniciar temporizador"
          onClick={() => {
            setRunning(false);
            setRemaining(initial);
            setFinished(false);
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      {mode === "cardio" && finished && onCardioComplete && (
        <button className="text-link timer-complete" onClick={onCardioComplete}>
          Registrar cardio realizado →
        </button>
      )}
    </section>
  );
}
export function VideoModal({
  exercise,
  onClose,
}: {
  exercise: Pick<
    Exercise,
    "name" | "videoUrl" | "tips" | "videoAlternative" | "sourceImage" | "demoCredit"
  > | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!exercise) return;
    const prior = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = oldOverflow;
      prior?.focus();
    };
  }, [exercise, onClose]);
  if (!exercise) return null;
  const alternative = exercise.videoAlternative;
  const sourceImage = exercise.sourceImage?.trim() ?? "";
  const videoUrl = exercise.videoUrl?.trim() ?? "";
  const embed = alternative
    ? alternative.embedUrl
      ? getVideoEmbedUrl(alternative.embedUrl)
      : null
    : getVideoEmbedUrl(videoUrl);
  const fallbackUrl = alternative?.watchUrl?.trim() || videoUrl;
  const hasMedia = Boolean(sourceImage || embed || fallbackUrl);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {sourceImage
                ? "REFERENCIA DE TU LÁMINA"
                : alternative
                  ? "DEMOSTRACIÓN ALTERNATIVA"
                  : videoUrl
                    ? "DEMOSTRACIÓN ORIGINAL"
                    : "SIN DEMOSTRACIÓN"}
            </span>
            <h2 id="video-title">{exercise.name}</h2>
          </div>
          <button
            className="icon-button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar video"
          >
            <X size={23} />
          </button>
        </div>
        <div
          className={
            sourceImage && !embed ? "exercise-reference-frame" : "video-frame"
          }
        >
          {sourceImage && !embed ? (
            <img
              src={sourceImage}
              alt={`Lámina original para consultar ${exercise.name}`}
            />
          ) : embed?.startsWith("https://www.youtube-nocookie.com/") ? (
            <YouTubeVideo
              embedUrl={embed}
              watchUrl={fallbackUrl}
              title={`Cómo hacer ${exercise.name}`}
            />
          ) : embed ? (
            <iframe
              src={embed}
              title={`Cómo hacer ${exercise.name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : fallbackUrl ? (
            <div className="video-unavailable">
              <p>
                {alternative && !alternative.embedUrl
                  ? "YouTube no permite reproducir este video dentro de la app."
                  : "No se puede insertar este video en la app."}
              </p>
              <a href={fallbackUrl} target="_blank" rel="noreferrer">
                Abrir video en otra pestaña <ExternalLink size={15} />
              </a>
            </div>
          ) : (
            <div className="video-empty-state" role="status">
              <Dumbbell size={34} strokeWidth={1.6} aria-hidden="true" />
              <p>No hay una demostración vinculada para este ejercicio.</p>
            </div>
          )}
        </div>
        <div className="video-information">
          <h3>
            {hasMedia ? "Hazlo con intención" : "Sin demostración vinculada"}
          </h3>
          <p>
            {exercise.tips ||
              (hasMedia
                ? "Revisa la demostración completa antes de empezar. Mantén el control del movimiento y detente si sientes dolor."
                : "No hay video ni lámina asociados. Sigue las indicaciones disponibles y detente si sientes dolor.")}
          </p>
          {exercise.demoCredit && videoUrl && (
            <p className="video-attribution">
              Fuente: {exercise.demoCredit}. Video externo vinculado al catálogo.
            </p>
          )}
          {alternative && (
            <p className="video-attribution">
              {alternative.title} · {alternative.creator}. Demostración externa;
              no forma parte del PDF.
            </p>
          )}
          <div className="video-links">
            {sourceImage && (
              <a
                href={sourceImage}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Abrir lámina original a tamaño completo{" "}
                <ExternalLink size={15} />
              </a>
            )}
            {alternative?.watchUrl?.trim() && (
              <a
                href={alternative.watchUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Abrir alternativa en {alternative.provider}{" "}
                <ExternalLink size={15} />
              </a>
            )}
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link original-video-link"
              >
                {videoUrl.includes("vimeo.com")
                  ? "Abrir video original en Vimeo"
                  : videoUrl.includes("youtube.com") ||
                      videoUrl.includes("youtu.be")
                    ? "Abrir video en YouTube"
                    : "Abrir demostración externa"}{" "}
                <ExternalLink size={15} />
              </a>
            )}
          </div>
          <small>
            {!hasMedia
              ? "Este ejercicio no tiene video ni lámina vinculados. Revisa las indicaciones de técnica. "
              : sourceImage && !embed
                ? "Las ilustraciones se conservan del material que compartiste. "
                : embed?.startsWith("https://www.youtube-nocookie.com/")
                  ? "Se utiliza el reproductor oficial de YouTube; si no funciona aquí, abre el mismo video con el enlace externo. "
                  : alternative && !alternative.embedUrl
                    ? "El video se abre en YouTube porque no admite inserción; el Vimeo original se conserva como referencia. "
                    : alternative
                      ? "La alternativa usa el reproductor oficial del proveedor; el enlace Vimeo original se conserva como referencia. "
                      : "Vimeo puede restringir la reproducción integrada según los permisos del propietario. "}
            Ante dolor, mareo o molestias, detén la sesión.
          </small>
        </div>
      </section>
    </div>
  );
}
export function StarCelebration({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (message) {
      const t = window.setTimeout(onClose, 2800);
      return () => window.clearTimeout(t);
    }
  }, [message, onClose]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="celebration"
          role="status"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
        >
          <div className="celebration-stars">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.span
                key={i}
                className={`burst-star star-${i}`}
                initial={{ scale: 0, rotate: -35 }}
                animate={{ scale: 1, rotate: reduce ? 0 : 12 }}
                transition={{
                  delay: reduce ? 0 : i * 0.08,
                  type: "spring",
                  stiffness: 180,
                }}
              >
                <Star size={i === 2 ? 42 : 23} fill="currentColor" />
              </motion.span>
            ))}
          </div>
          <strong>{message}</strong>
          <span>Un paso más hacia tu mejor versión.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
