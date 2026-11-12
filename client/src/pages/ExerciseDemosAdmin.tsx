import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Film, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { FitLayout } from "@/components/FitLayout";
import { VideoModal } from "@/components/FitWidgets";
import { useFit } from "@/contexts/FitContext";
import { api } from "@/lib/fit";
import { EXERCISE_MUSCLE_GROUPS } from "@shared/exercise-library";
import type { Exercise } from "@shared/routine";
import { withPersonalDemo, type PersonalExerciseMedia } from "@shared/personal-exercise-media";
import "../exercise-demos.css";

const catalog = EXERCISE_MUSCLE_GROUPS.flatMap(group =>
  group.exercises.map(exercise => ({
    ...exercise,
    groupName: group.name,
  }))
);

export default function ExerciseDemosAdmin() {
  const { user, loading } = useFit();
  const [media, setMedia] = useState<PersonalExerciseMedia[]>([]);
  const [selectedId, setSelectedId] = useState(catalog[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Pick<
    Exercise, "name" | "videoUrl" | "tips" | "videoAlternative" | "sourceImage" | "demoCredit"
  > | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const result = await api<{ media: PersonalExerciseMedia[] }>("/personal-exercises/media");
      setMedia(result.media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
    } finally {
      setFetching(false);
    }
  }, []);
  useEffect(() => {
    if (user?.role === "admin") void load();
  }, [user?.id, user?.role, load]);
  useEffect(() => {
    const entry = media.find(item => item.exerciseId === selectedId);
    setUrl(entry?.videoUrl ?? "");
    setCredit(entry?.credit ?? "");
  }, [media, selectedId]);

  const selected = catalog.find(item => item.id === selectedId);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return q ? catalog.filter(item =>
      `${item.name} ${item.groupName}`.toLocaleLowerCase("es").includes(q)
    ) : catalog;
  }, [query]);
  const linked = media.filter(item => item.videoUrl).length;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    try {
      const response = await api<{ media: PersonalExerciseMedia }>(
        `/admin/personal-exercises/${encodeURIComponent(selected.id)}/media`,
        {
          method: "PUT",
          body: { videoUrl: url.trim(), credit: credit.trim() },
        }
      );
      setMedia(current => [
        ...current.filter(item => item.exerciseId !== selected.id),
        ...(response.media.videoUrl ? [response.media] : []),
      ]);
      toast.success(response.media.videoUrl ? "Demostración vinculada." : "Demostración retirada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo guardar el video.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <FitLayout><div className="loading-panel">Verificando permisos…</div></FitLayout>;
  if (!user || user.role !== "admin") {
    return (
      <FitLayout>
        <section className="demo-admin-locked">
          <ShieldCheck size={24} />
          <h1>Gestión exclusiva de administración</h1>
          <p>Para revisar ejercicios podés entrar a tu Plan Personal. La edición de videos requiere permisos de administrador.</p>
          <Link href="/planes" className="button secondary">Volver a Mis planes</Link>
        </section>
      </FitLayout>
    );
  }

  return (
    <FitLayout title="Demostraciones del Plan Personal">
      <main className="demo-admin">
        <Link href="/admin" className="text-link">
          <ArrowLeft size={16} /> Volver a Administración
        </Link>
        <header className="demo-admin-header">
          <div>
            <span className="eyebrow">CATÁLOGO DEL PLAN PERSONAL</span>
            <h1>Demostraciones de ejercicios</h1>
            <p>Vinculá videos concretos de YouTube o Vimeo. Se verán inmediatamente en el constructor y durante el entrenamiento, sin editar las rutinas ni reiniciar el progreso.</p>
          </div>
          <span className="demo-admin-count">{linked} / {catalog.length} con video</span>
        </header>
        <div className="demo-admin-note">
          <BookOpen size={21} />
          <p>
            <strong>Control editorial:</strong> verificá que el video enseñe exactamente la variante y el agarre indicados.
            Confirmá que su propietario permita compartirlo. No se copian ni almacenan videos en Ritmo Fit.
            Los ejercicios pendientes siguen ofreciendo indicaciones técnicas.
          </p>
        </div>
        <div className="demo-admin-columns">
          <section className="demo-admin-catalog" aria-label="Seleccionar ejercicio">
            <label className="demo-admin-search">
              <Search size={16} />
              <span className="sr-only">Filtrar ejercicios</span>
              <input value={query} onChange={event => setQuery(event.target.value)}
                placeholder="Buscar ejercicio o músculo…" type="search"/>
            </label>
            {fetching && <p>Cargando enlaces…</p>}
            {error && <p role="alert">{error} <button type="button" onClick={() => void load()}>Reintentar</button></p>}
            <div className="demo-admin-exercises">
              {filtered.map(item => {
                const hasVideo = media.some(entry => entry.exerciseId === item.id && entry.videoUrl);
                return (
                  <button key={item.id} type="button"
                    className={`demo-admin-exercise ${selectedId === item.id ? "active" : ""}`}
                    aria-pressed={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.groupName}</small>
                    </span>
                    {hasVideo ? <CheckCircle2 size={17} color="#167d69"/> : <Film size={17}/>}
                  </button>
                );
              })}
              {!filtered.length && <p>No hay ejercicios que coincidan.</p>}
            </div>
          </section>
          {selected && (
            <section className="demo-admin-editor" aria-label="Editor de demostración">
              <span className="eyebrow">{selected.groupName.toUpperCase()}</span>
              <h2>{selected.name}</h2>
              <p>{selected.tips}</p>
              <form onSubmit={save}>
                <label>
                  <span>Enlace al video (YouTube o Vimeo)</span>
                  <input type="url" value={url} onChange={event => setUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…" maxLength={2048}/>
                </label>
                <label>
                  <span>Canal, autor o fuente del video</span>
                  <input value={credit} onChange={event => setCredit(event.target.value)}
                    placeholder="Ej.: nombre del canal o entrenador" maxLength={140}/>
                </label>
                <div className="demo-admin-actions">
                  <button type="submit" className="button primary" disabled={busy || fetching}>
                    <Save size={15}/> {busy ? "Guardando…" : url.trim() ? "Guardar demostración" : "Quitar demostración"}
                  </button>
                  <button type="button" className="button secondary" onClick={() => {
                    const exercise: Exercise = {
                      id: `pp-d1-${selected.id}`,
                      name: selected.name,
                      videoUrl: "",
                      thumbnail: "",
                      block: 1,
                      tips: selected.tips,
                    };
                    // A not-yet-saved URL is previewable as well, after successful
                    // server validation for published media.
                    setPreview({
                      ...withPersonalDemo(exercise, media),
                      videoUrl: url.trim() || "",
                      demoCredit: credit.trim(),
                    });
                  }}>
                    <ExternalLink size={15} /> Vista previa
                  </button>
                </div>
              </form>
              <small>Dejá ambos campos vacíos para retirar un video. El ejercicio y su historial se conservan.</small>
            </section>
          )}
        </div>
      </main>
      <VideoModal exercise={preview} onClose={() => setPreview(null)}/>
    </FitLayout>
  );
}
