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

  it("asocia 93 alternativas y referencias de YouTube a ejercicios reales sin reemplazar los Vimeo originales", () => {
    const routineExercises = Object.values(ROUTINE).flatMap(days =>
      days.flatMap(day => day.exercises)
    );
    const alternativeEntries = Object.entries(VIDEO_ALTERNATIVES);

    expect(alternativeEntries).toHaveLength(93);
    for (const [exerciseName, alternative] of alternativeEntries) {
      expect(
        routineExercises.some(exercise => exercise.name === exerciseName)
      ).toBe(true);
      if (alternative.embedUrl) {
        expect(alternative.embedUrl).toMatch(
          /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/
        );
        expect(getVideoEmbedUrl(alternative.embedUrl)).toBe(
          `${alternative.embedUrl}?rel=0&playsinline=1`
        );
      } else {
        expect(["Sentadilla sumo", "Crunch piernas flexionadas"]).toContain(
          exerciseName
        );
      }
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

  it("conserva las siete URLs de YouTube que indicó la usuaria", () => {
    const supplied: Record<string, string> = {
      "Sentadilla con toque de rodilla":
        "https://www.youtube.com/shorts/X0yrW-ta5b0",
      "Desplante con codo cruzado":
        "https://www.youtube.com/watch?v=LGlgmlCkuWg&pp=ygUaRGVzcGxhbnRlIGNvbiBjb2RvIGNydXphZG8%3D",
      "Hip thrust": "https://www.youtube.com/shorts/pSwLdoIwPik",
      "Curl femoral sentado": "https://www.youtube.com/shorts/VzXQuzPJwHU",
      "Remo horizontal":
        "https://www.youtube.com/shorts/iyh2wbpqlNY?feature=share",
      "Pull over": "https://www.youtube.com/shorts/rRZ8hhpKozA?feature=share",
      "Agarre supino máquina Smith":
        "https://www.youtube.com/watch?v=iGt14SeaOeQ&pp=ygUcQWdhcnJlIHN1cGlubyBtw6FxdWluYSBzbWl0aA%3D%3D",
    };

    expect(Object.keys(supplied)).toHaveLength(7);
    for (const [exerciseName, watchUrl] of Object.entries(supplied)) {
      const alternative = VIDEO_ALTERNATIVES[exerciseName];
      expect(alternative).toBeDefined();
      expect(alternative.watchUrl).toBe(watchUrl);
      expect(alternative.sourceUrl).toBe(watchUrl);
      expect(getVideoEmbedUrl(alternative.embedUrl ?? "")).toBe(
        `${alternative.embedUrl}?rel=0&playsinline=1`
      );
    }
  });

  it("conserva los 19 enlaces nuevos que permiten inserción y deja dos como externos", () => {
    const supplied: Record<string, string> = {
      "Sentadilla con doble jumping Jack":
        "https://www.youtube.com/shorts/K-lxz2kSoR0",
      Bicicletas: "https://www.youtube.com/shorts/XTzt-nekQh4?feature=share",
      "Sprint a toda velocidad en caminadora":
        "https://www.youtube.com/shorts/0fYVFELOyRI?feature=share",
      "Plancha alta tocando puntas de los pies":
        "https://www.youtube.com/shorts/VSCWAVQhQdk",
      "V ups": "https://www.youtube.com/shorts/saHkR_MvIdA",
      "Mountain climber zancada completa":
        "https://www.youtube.com/watch?v=kLh-uczlPLg&pp=ygUhTW91bnRhaW4gY2xpbWJlciB6YW5jYWRhIGNvbXBsZXRh0gcJCSkMAYcqIYzv",
      "Prensa pies a la altura de tus hombros":
        "https://www.youtube.com/shorts/B6ncs6zWsIo?feature=share",
      "Sentadilla + desplante":
        "https://www.youtube.com/shorts/kTETkyhfOM8?feature=share",
      "Sentadilla con pies cruzados": "https://youtu.be/_wucwNLt9h4?t=18",
      "Salto en sentadilla + sentadilla lateral":
        "https://www.youtube.com/shorts/WhwK4abpoD4",
      "Rodilla – medio burpee": "https://www.youtube.com/shorts/B_M3o3T1YFY",
      "Medio burpee con toques de talones":
        "https://www.youtube.com/shorts/U41BnapyufE",
      "Agarre prono máquina Smith":
        "https://www.youtube.com/watch?v=f4zUg5CAnNY&pp=ygUbQWdhcnJlIHByb25vIG3DoXF1aW5hIHNtaXRo",
      "Alabanzas en polea":
        "https://www.youtube.com/shorts/xYIVO1nCm3E?t=6&feature=share",
      "Sentadilla con toque y salto":
        "https://www.youtube.com/shorts/u22GCGFa00w",
      "Rebotes en sentadilla adelante y atrás":
        "https://www.youtube.com/shorts/F43lMNff864",
      "Sentadilla con toque cruzado":
        "https://www.youtube.com/shorts/c1OqCwe2eOs",
      "Sentadilla lado a lado toque trasero":
        "https://www.youtube.com/watch?v=JEu3HxYrGSc&pp=ygUkU2VudGFkaWxsYSBsYWRvIGEgbGFkbyB0b3F1ZSB0cmFzZXJv",
      "Elevación de rodillas alternadas en silla romana":
        "https://www.youtube.com/shorts/G_xkqJkTxOg",
    };

    expect(Object.keys(supplied)).toHaveLength(19);
    for (const [exerciseName, watchUrl] of Object.entries(supplied)) {
      const alternative = VIDEO_ALTERNATIVES[exerciseName];
      expect(alternative).toBeDefined();
      expect(alternative.watchUrl).toBe(watchUrl);
      expect(alternative.sourceUrl).toBe(watchUrl);
      expect(getVideoEmbedUrl(alternative.embedUrl ?? "")).toBe(
        `${alternative.embedUrl}?rel=0&playsinline=1`
      );
    }

    expect(VIDEO_ALTERNATIVES["Sentadilla sumo"].watchUrl).toBe(
      "https://www.youtube.com/shorts/gdfmmOq-Ypw?feature=share"
    );
    expect(VIDEO_ALTERNATIVES["Sentadilla sumo"].embedUrl).toBeUndefined();
    expect(VIDEO_ALTERNATIVES["Crunch piernas flexionadas"].watchUrl).toBe(
      "https://www.youtube.com/shorts/js5_QOy2PL8"
    );
    expect(
      VIDEO_ALTERNATIVES["Crunch piernas flexionadas"].embedUrl
    ).toBeUndefined();
    const routineExercises = Object.values(ROUTINE).flatMap(days =>
      days.flatMap(day => day.exercises)
    );
    expect(
      routineExercises.find(exercise => exercise.name === "Sentadilla sumo")
        ?.videoUrl
    ).toContain("vimeo.com/753375754");
    expect(
      routineExercises.find(
        exercise => exercise.name === "Crunch piernas flexionadas"
      )?.videoUrl
    ).toContain("vimeo.com/811444469");
  });
});
