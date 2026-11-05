const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const VIMEO_HASH = /^[A-Za-z0-9]+$/;

function videoIdFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const playerPath = host === "player.vimeo.com" || parts[0] === "video";
    const id = playerPath ? parts[1] : parts[0];
    return id && VIMEO_ID.test(id) ? id : null;
  }

  if (host === "youtu.be") {
    const id = parts[0];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const id =
      parts[0] === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live"].includes(parts[0] ?? "")
          ? parts[1]
          : null;
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  return null;
}

/** Convert only known Vimeo and YouTube URL forms into their official player URL. */
export function getVideoEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const id = videoIdFromUrl(url);
  if (!id) return null;

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const hash =
      (host === "player.vimeo.com" || parts[0] === "video"
        ? parts[2]
        : parts[1]) ?? url.searchParams.get("h") ?? "";
    const params = new URLSearchParams();
    if (hash && VIMEO_HASH.test(hash)) params.set("h", hash);
    params.set("title", "0");
    params.set("byline", "0");
    params.set("portrait", "0");
    return `https://player.vimeo.com/video/${id}?${params.toString()}`;
  }

  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`;
}
