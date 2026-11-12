import { describe, expect, it } from "vitest";
import type { Exercise } from "./routine";
import {
  catalogExerciseId,
  personalDemoThumbnail,
  withPersonalDemo,
  type PersonalExerciseMedia,
} from "./personal-exercise-media";

const example: Exercise = {
  id: "pp-d1-jalon-polea-agarre-v",
  name: "Jalón en polea alta con agarre V",
  block: 1,
  videoUrl: "",
  thumbnail: "",
  tips: "Torso estable y movimiento controlado.",
};

const media: PersonalExerciseMedia[] = [{
  exerciseId: "jalon-polea-agarre-v",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  credit: "Canal demostrativo",
}];

describe("Demostraciones editoriales del catálogo", () => {
  it("identifica el mismo ejercicio aun cuando cambie de día", () => {
    expect(catalogExerciseId("pp-d1-jalon-polea-agarre-v")).toBe("jalon-polea-agarre-v");
    expect(catalogExerciseId("pp-d7-jalon-polea-agarre-v")).toBe("jalon-polea-agarre-v");
    expect(catalogExerciseId("tone-d1-e1")).toBeNull();
    expect(catalogExerciseId("pp-d0-jalon-polea-agarre-v")).toBeNull();
  });

  it("enlaza un video aprobado sin modificar el ejercicio original", () => {
    const before = structuredClone(example);
    const decorated = withPersonalDemo(example, media);
    expect(decorated.videoUrl).toBe(media[0].videoUrl);
    expect(decorated.demoCredit).toBe("Canal demostrativo");
    expect(decorated.thumbnail).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(example).toEqual(before);
  });

  it("no agrega demostraciones no vinculadas o con URL inválida", () => {
    expect(withPersonalDemo(example, [])).toEqual(example);
    expect(withPersonalDemo(example, [{
      ...media[0],
      videoUrl: "https://example.com/watch?v=dQw4w9WgXcQ",
    }])).toEqual(example);
    expect(withPersonalDemo({ ...example, id: "tone-d1-e1" }, media).videoUrl).toBe("");
    expect(personalDemoThumbnail("https://vimeo.com/753376052")).toBe("");
  });
});
