import { afterEach, describe, expect, it, vi } from "vitest";

function setup() {
  const scripts: Record<string, unknown>[] = [];
  const host: Record<string, unknown> = {
    setTimeout,
    clearTimeout,
  };
  vi.stubGlobal("window", host);
  vi.stubGlobal("document", {
    getElementById: (id: string) => scripts.find(s => s.id === id) ?? null,
    createElement: () => ({ remove: vi.fn() }),
    head: {
      appendChild: (script: Record<string, unknown>) => scripts.push(script),
    },
  });
  return { host, scripts };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});

describe("Cargador oficial de YouTube y respaldo ante fallos", () => {
  it("reutiliza el API si ya está disponible", async () => {
    const { host, scripts } = setup();
    const api = { Player: vi.fn() };
    host.YT = api;
    const { loadYouTubeAPI } = await import("./youtube-player");
    expect(await loadYouTubeAPI()).toBe(api);
    expect(scripts).toHaveLength(0);
  });

  it("comparte una sola carga y conserva el callback anterior", async () => {
    const { host, scripts } = setup();
    const previous = vi.fn();
    host.onYouTubeIframeAPIReady = previous;
    const { loadYouTubeAPI } = await import("./youtube-player");
    const first = loadYouTubeAPI();
    expect(loadYouTubeAPI()).toBe(first);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe("https://www.youtube.com/iframe_api");
    const api = { Player: vi.fn() };
    host.YT = api;
    (host.onYouTubeIframeAPIReady as () => void)();
    expect(await first).toBe(api);
    expect(previous).toHaveBeenCalledOnce();
  });

  it("rechaza errores de carga para permitir mostrar el enlace externo", async () => {
    const { scripts } = setup();
    const { loadYouTubeAPI } = await import("./youtube-player");
    const request = loadYouTubeAPI();
    const rejection = expect(request).rejects.toThrow("could not be loaded");
    (scripts[0].onerror as () => void)();
    await rejection;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
  });

  it("rechaza una carga que no responde sin dejar el reproductor esperando", async () => {
    vi.useFakeTimers();
    const { host, scripts } = setup();
    const previous = vi.fn();
    host.onYouTubeIframeAPIReady = previous;
    const { loadYouTubeAPI } = await import("./youtube-player");
    const request = loadYouTubeAPI();
    const rejection = expect(request).rejects.toThrow("did not load");
    await vi.advanceTimersByTimeAsync(15000);
    await rejection;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    expect(host.onYouTubeIframeAPIReady).toBe(previous);
  });
});
