import { describe, expect, it } from "vitest";
import { hasUnsavedExerciseMarks, mergeExerciseMarks } from "./quick-sets";

const exercise = {
  id: "pp-d1-jalon-polea-agarre-v",
  seconds: undefined,
  reps: "10 repeticiones",
};
const keys = [
  "pp-d1-jalon-polea-agarre-v:1",
  "pp-d1-jalon-polea-agarre-v:2",
];

describe("Registro rápido de series en móvil", () => {
  it("guarda cargas reales y series completadas en una única carga útil", () => {
    const existing = [{ setKey: "pp-d1-remo-mancuerna:1", weightKg: 20, reps: 10 }];
    const marks = mergeExerciseMarks(exercise, 2, {
      [keys[0]]: { weightKg: "40", reps: "12" },
      [keys[1]]: { weightKg: "45.5", reps: "10" },
    }, existing);
    expect(marks).toEqual([
      existing[0],
      { setKey: keys[0], weightKg: 40, reps: 12 },
      { setKey: keys[1], weightKg: 45.5, reps: 10 },
    ]);
    expect(existing).toHaveLength(1);
  });

  it("elimina una marca vaciada sin afectar otras series ni ejercicios", () => {
    const existing = [
      { setKey: keys[0], weightKg: 40, reps: 12 },
      { setKey: keys[1], weightKg: 42.5, reps: 10 },
      { setKey: "pp-d1-remo-mancuerna:1", weightKg: 20, reps: 10 },
    ];
    expect(mergeExerciseMarks(exercise, 2, {
      [keys[0]]: { weightKg: "", reps: "" },
      [keys[1]]: { weightKg: "42.5", reps: "10" },
    }, existing)).toEqual([existing[2], existing[1]]);
  });

  it("rechaza un peso incorrecto antes de marcar la serie como realizada", () => {
    expect(() => mergeExerciseMarks(exercise, 2, {
      [keys[0]]: { weightKg: "-5", reps: "12" },
    }, [])).toThrow(/peso/i);
    expect(() => mergeExerciseMarks(exercise, 2, {
      [keys[0]]: { weightKg: "40", reps: "10.5" },
    }, [])).toThrow(/repeticiones/i);
  });

  it("permite ejercicios con tiempo, sin inventar repeticiones", () => {
    const marks = mergeExerciseMarks({
      id: "pp-d1-plancha-lateral",
      seconds: 30,
      reps: "30 segundos",
    }, 1, {
      "pp-d1-plancha-lateral:1": { weightKg: "5", reps: "12" },
    }, []);
    expect(marks).toEqual([{
      setKey: "pp-d1-plancha-lateral:1",
      weightKg: 5, reps: null,
    }]);
  });

  it("detecta borradores sin guardar y no confunde las marcas persistidas", () => {
    expect(hasUnsavedExerciseMarks(keys, {
      [keys[0]]: { weightKg: "40", reps: "12" },
    }, [{ setKey: keys[0], weightKg: 40, reps: 12 }])).toBe(false);

    expect(hasUnsavedExerciseMarks(keys, {
      [keys[0]]: { weightKg: "45", reps: "12" },
    }, [{ setKey: keys[0], weightKg: 40, reps: 12 }])).toBe(true);

    expect(hasUnsavedExerciseMarks(keys, {}, [])).toBe(false);
  });
});
