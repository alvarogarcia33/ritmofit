import { describe, expect, it } from "vitest";
import {
  exerciseIdentity,
  formatSetMark,
  readSetPerformance,
  validateSetPerformance,
} from "./set-performance";

const allowed = ["pp-d1-jalon-polea-agarre-v:1", "pp-d1-jalon-polea-agarre-v:2"];

describe("Marcas por serie con valores reales", () => {
  it("valida cargas en kg, repeticiones enteras y series de la rutina", () => {
    const marks = validateSetPerformance([
      { setKey: allowed[1], weightKg: 45.5, reps: 8 },
      { setKey: allowed[0], weightKg: 40, reps: 12 },
    ], allowed);
    expect(marks.map(mark => mark.setKey)).toEqual(allowed);
    expect(marks[0]).toMatchObject({ weightKg: 40, reps: 12 });
    expect(formatSetMark(marks[1])).toBe("45.5 kg · 8 reps");
  });

  it("permite autocarga, solo peso o solo repeticiones, y elimina entradas vacías", () => {
    const marks = validateSetPerformance([
      { setKey: allowed[0], weightKg: null, reps: 12 },
      { setKey: allowed[1], weightKg: 0, reps: null },
    ], allowed);
    expect(marks).toHaveLength(2);
    expect(marks[1].weightKg).toBe(0);
    expect(validateSetPerformance([
      { setKey: allowed[0], weightKg: null, reps: null },
    ], allowed)).toEqual([]);
  });

  it.each([
    [{ setKey: "pp-d2-jalon-polea-agarre-v:1", weightKg: 40, reps: 10 }],
    [{ setKey: allowed[0], weightKg: -1, reps: 10 }],
    [{ setKey: allowed[0], weightKg: 1001, reps: 10 }],
    [{ setKey: allowed[0], weightKg: 25.123, reps: 10 }],
    [{ setKey: allowed[0], weightKg: "40", reps: 10 }],
    [{ setKey: allowed[0], weightKg: Number.POSITIVE_INFINITY, reps: 10 }],
    [{ setKey: allowed[0], weightKg: 40, reps: 0 }],
    [{ setKey: allowed[0], weightKg: 40, reps: 201 }],
    [{ setKey: allowed[0], weightKg: 40, reps: 8.5 }],
    [{ setKey: allowed[0], weightKg: 40, reps: 8 },
     { setKey: allowed[0], weightKg: 45, reps: 7 }],
  ])("rechaza marcas inválidas o duplicadas (%#)", (...items) => {
    expect(() => validateSetPerformance(items, allowed)).toThrow();
  });

  it("impide repeticiones en ejercicios cronometrados", () => {
    expect(() => validateSetPerformance([
      { setKey: allowed[0], weightKg: 5, reps: 12 },
    ], allowed, new Set(["pp-d1-jalon-polea-agarre-v"]))).toThrow(/cronometrados/);
  });

  it("tolera registros antiguos y admite estructuras JSON guardadas", () => {
    expect(readSetPerformance(null)).toEqual([]);
    expect(readSetPerformance("garbled")).toEqual([]);
    expect(readSetPerformance(JSON.stringify([{ setKey: allowed[0], weightKg: 40, reps: 12 }])))
      .toEqual([{ setKey: allowed[0], weightKg: 40, reps: 12 }]);
    expect(exerciseIdentity("pp-d1-jalon-polea-agarre-v"))
      .toBe(exerciseIdentity("pp-d7-jalon-polea-agarre-v"));
    expect(exerciseIdentity("p22-e1")).toBe("p22-e1");
  });
});
