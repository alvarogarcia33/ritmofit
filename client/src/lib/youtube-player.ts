export type YouTubePlayer = { destroy(): void };
export type YouTubeAPI = {
  Player: new (
    element: HTMLElement,
    options: { events: { onError: (event: { data: number }) => void } }
  ) => YouTubePlayer;
};

type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};

let loadingAPI: Promise<YouTubeAPI> | null = null;

export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  const host = window as YouTubeWindow;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (loadingAPI) return loadingAPI;
  loadingAPI = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = host.onYouTubeIframeAPIReady;
    let ownedScript: HTMLScriptElement | undefined;
    let timeout: number;
    const restore = () => {
      window.clearTimeout(timeout);
      if (host.onYouTubeIframeAPIReady === ready)
        host.onYouTubeIframeAPIReady = previous;
    };
    const fail = (message: string) => {
      restore();
      ownedScript?.remove();
      reject(new Error(message));
    };
    const ready = () => {
      restore();
      try {
        previous?.();
      } catch {
        // A preexisting consumer must not block this application's player.
      }
      if (host.YT?.Player) resolve(host.YT);
      else fail("YouTube player is unavailable");
    };
    timeout = window.setTimeout(() => {
      fail("YouTube player did not load");
    }, 15000);
    host.onYouTubeIframeAPIReady = ready;
    if (!document.getElementById("ritmo-youtube-player-api")) {
      ownedScript = document.createElement("script");
      ownedScript.id = "ritmo-youtube-player-api";
      ownedScript.src = "https://www.youtube.com/iframe_api";
      ownedScript.async = true;
      ownedScript.onerror = () => fail("YouTube player could not be loaded");
      document.head.appendChild(ownedScript);
    }
  }).catch(error => {
    loadingAPI = null;
    throw error;
  });
  return loadingAPI;
}
