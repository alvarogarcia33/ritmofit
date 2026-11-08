import { describe, it, expect } from "vitest";
import { DEFAULT_PLANS } from "../../../shared/programs";
import { validateEditablePlan } from "./plan-editor";

describe("Editor de planes existentes y futuros", () => {
  it("acepta los metadatos de Adelgazar sin exigir cantidades de Tonificar", () =>
    expect(validateEditablePlan(DEFAULT_PLANS[0])).toBeNull());
  it("acepta los IDs tone-d de Tonificar sin convertirlos a IDs nuevos", () =>
    expect(validateEditablePlan(DEFAULT_PLANS[1])).toBeNull());
  it("permite guardar un borrador y rechaza publicarlo sin portada ni días", () => {
    const draft = {
      ...DEFAULT_PLANS[1],
      id: "plan-nuevo",
      coverImage: "",
      published: false,
      routine: { first: [], second: [] },
    };
    expect(validateEditablePlan(draft)).toBeNull();
    expect(validateEditablePlan({ ...draft, published: true })).not.toBeNull();
  });
});
