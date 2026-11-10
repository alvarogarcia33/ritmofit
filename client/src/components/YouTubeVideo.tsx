import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { loadYouTubeAPI, type YouTubePlayer } from "@/lib/youtube-player";

export function YouTubeVideo({
  embedUrl,
  watchUrl,
  title,
}: {
  embedUrl: string;
  watchUrl: string;
  title: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const holder = container.current;
    if (!holder) return;
    let cancelled = false;
    let player: YouTubePlayer | undefined;
    setUnavailable(false);
    const frame = document.createElement("iframe");
    const url = new URL(embedUrl);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
    frame.src = url.toString();
    frame.title = title;
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    holder.appendChild(frame);
    loadYouTubeAPI()
      .then(api => {
        if (cancelled) return;
        player = new api.Player(frame, {
          events: {
            onError: () => {
              if (!cancelled) setUnavailable(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // The iframe may already have been detached by its provider.
        // Closing a demonstration must not interrupt the workout screen.
      } finally {
        holder.replaceChildren();
      }
    };
  }, [embedUrl, title]);

  return (
    <>
      <div
        className="youtube-player-slot"
        ref={container}
        hidden={unavailable}
      />
      {unavailable && (
        <div className="video-unavailable" role="status">
          <p>
            YouTube no pudo reproducir este video aquí. Puedes abrir la misma
            demostración en YouTube y luego volver a tu sesión.
          </p>
          <a href={watchUrl} target="_blank" rel="noopener noreferrer">
            Abrir video en YouTube <ExternalLink size={15} />
          </a>
          <small>Tus series y tu progreso no cambian.</small>
        </div>
      )}
    </>
  );
}
