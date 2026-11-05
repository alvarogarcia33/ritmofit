import { describe, expect, it } from "vitest";
import { ROUTINE } from "../../../shared/routine";
import { VIDEO_ALTERNATIVES } from "../../../shared/video-alternatives";
import { getVideoEmbedUrl } from "../../../shared/video";

describe("URLs de demostración de ejercicios", () => {
  it("normaliza enlaces Vimeo y conserva el hash de videos no listados", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/753376052?fl=pl&fe=sh")).toBe(
      "https://player.vimeo.com/video/753376052?title=0&byline=0&portrait=0"
    );
    expect(
      getVideoEmbedUrl("https://vimeo.com/1018058006/f29660aa34?share=copy")
    ).toBe(
      "https://player.vimeo.com/video/1018058006?h=f29660aa34&title=0&byline=0&portrait=0"
    );
  });

  it("admite URL canónica, corta y embed de YouTube", () => {
    const expected =
      "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0&playsinline=1";
    expect(
      getVideoEmbedUrl("https://www.youtube.com/watch?v=abcdefghijk&t=4s")
    ).toBe(expected);
    expect(getVideoEmbedUrl("https://youtu.be/abcdefghijk")).toBe(expected);
    expect(
      getVideoEmbedUrl("https://www.youtube-nocookie.com/embed/abcdefghijk")
    ).toBe(expected);
  });

  it("rechaza URLs inseguras, identificadores inválidos y otros proveedores", () => {
    expect(getVideoEmbedUrl("http://vimeo.com/753376052")).toBeNull();
    expect(getVideoEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(getVideoEmbedUrl("https://youtube.com/watch?v=bad-id")).toBeNull();
    expect(getVideoEmbedUrl("javascript:alert(1)")).toBeNull();
  });

  it("asocia 65 alternativas de YouTube a ejercicios reales sin reemplazar los Vimeo originales", () => {
    const routineExercises = Object.values(ROUTINE).flatMap(days =>
      days.flatMap(day => day.exercises)
    );
    const alternativeEntries = Object.entries(VIDEO_ALTERNATIVES);

    expect(alternativeEntries).toHaveLength(65);
    for (const [exerciseName, alternative] of alternativeEntries) {
      expect(
        routineExercises.some(exercise => exercise.name === exerciseName)
      ).toBe(true);
      expect(alternative.embedUrl).toMatch(
        /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/
      );
      expect(getVideoEmbedUrl(alternative.embedUrl)).toBe(
        `${alternative.embedUrl}?rel=0&playsinline=1`
      );
      expect(alternative.watchUrl).toBe(alternative.sourceUrl);
    }

    expect(VIDEO_ALTERNATIVES["Sentadilla Goblet"].watchUrl).toBe(
      "https://www.youtube.com/watch?v=nfX7IFK9UNI"
    );
    expect(
      routineExercises.find(exercise => exercise.name === "Sentadilla Goblet")
        ?.videoUrl
    ).toContain("vimeo.com/753376052");
  });
});
