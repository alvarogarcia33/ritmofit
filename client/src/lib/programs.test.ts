import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLANS,
  exerciseSets,
  planConfig,
  planDay,
  planDays,
  planTotalSessions,
  replacePlanExerciseMediaFromDefault,
  requiredPlanSets,
} from "../../../shared/programs";
import { ROUTINE } from "../../../shared/routine";
import { getVideoEmbedUrl } from "../../../shared/video";
import { currentProgramDay, overdueDays, type FitUser } from "./fit";

const legacy = DEFAULT_PLANS.find(p => p.id === "adelgazar")!;
const tone = DEFAULT_PLANS.find(p => p.id === "tonificar")!;
const user: FitUser = {
  id: 1,
  username: "persona",
  fullName: "Persona",
  email: "persona@example.com",
  role: "user",
  level: "beginner",
  startDate: "2026-11-02",
  reminderTime: "09:00",
  remindersEnabled: true,
  timezone: "America/Santiago",
  createdAt: "2026-11-01T00:00:00Z",
  lastLogin: null,
};
afterEach(() => vi.useRealTimers());
describe("Biblioteca de planes y dosificación de las fuentes", () => {
  it("envuelve Adelgazar sin modificar su catálogo, sus días o sus 24 sesiones", () => {
    expect(legacy.routine).toBe(ROUTINE);
    expect(planTotalSessions(legacy)).toBe(24);
    expect(requiredPlanSets(legacy, 1, 1, "beginner")).toHaveLength(20);
    expect(requiredPlanSets(legacy, 1, 1, "intermediate")).toHaveLength(28);
    expect(requiredPlanSets(legacy, 1, 1, "advanced")).toHaveLength(27);
  });
  it("usa portadas originales propias de cada plan sin reemplazar las láminas ni rutinas", () => {
    expect(tone.coverImage).toBe(
      "/manus-storage/async-images/VwMfzeRAmktLUa0hud9r3g/image-1.webp"
    );
    expect(legacy.coverImage).toBe(
      "/manus-storage/async-images/zP49ZzlgK0C48Q1zStaQj1/image-1.webp"
    );
    expect(legacy.subtitle).toBe("Fuerza + movimiento");
    expect(legacy.routine).toBe(ROUTINE);
    expect(tone.subtitle).toBe("Fuerza + control");
    expect(tone.routine.first.map(day => day.sourceImage)).toEqual([
      "/plans/tonificar/day-1.webp",
      "/plans/tonificar/day-2.webp",
      "/plans/tonificar/day-3.webp",
      "/plans/tonificar/day-4.webp",
      "/plans/tonificar/day-5.webp",
    ]);
  });
  it("organiza Tonificar con las 28 fichas de lunes a viernes y deja el fin de semana sin sesión", () => {
    expect(tone.routine.first.map(d => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(tone.routine.first.map(d => d.exercises.length)).toEqual([
      6, 5, 6, 5, 6,
    ]);
    expect(tone.routine.first.flatMap(d => d.exercises)).toHaveLength(28);
    expect(planTotalSessions(tone)).toBe(20);
    expect(planDay(tone, 1, 6)).toBeUndefined();
    expect(planDay(tone, 1, 7)).toBeUndefined();
    expect(planDays(tone, 4).map(d => d.focus)).toEqual(
      planDays(tone, 1).map(d => d.focus)
    );
  });
  it("mantiene tres series y las cantidades específicas, sin niveles ni cardio ficticio", () => {
    const all = tone.routine.first.flatMap(d => d.exercises);
    expect(all.every(e => exerciseSets(tone, e, "advanced") === 3)).toBe(true);
    expect(planConfig(tone, "beginner").cardioMinutes).toBe(0);
    expect(planConfig(tone, "advanced").cardioMinutes).toBe(0);
    expect(
      planDay(tone, 1, 1)?.exercises.find(e => e.name === "Hip thrust")?.reps
    ).toBe("10 repeticiones");
    expect(
      planDay(tone, 1, 5)?.exercises.find(e => e.name === "Hip thrust")?.reps
    ).toBe("15 repeticiones");
    expect(
      all.filter(e => e.name === "Plancha frontal").map(e => e.seconds)
    ).toEqual([45, 45]);
    expect(all.find(e => e.name === "Femorales")?.reps).toContain(
      "10 bajando el peso a la mitad"
    );
    expect(all.find(e => e.name === "Sillón de cuádriceps")?.reps).toContain(
      "1 repetición al fallo"
    );
    expect(requiredPlanSets(tone, 1, 1, "beginner")).toHaveLength(18);
  });
  it("utiliza IDs nuevos y referencias originales, sin colisiones con el historial del PDF", () => {
    const old = new Set(
      Object.values(ROUTINE).flatMap(days =>
        days.flatMap(d => d.exercises.map(e => e.id))
      )
    );
    const all = tone.routine.first.flatMap(d => d.exercises);
    expect(new Set(all.map(e => e.id)).size).toBe(28);
    expect(
      all.every(
        e =>
          !old.has(e.id) &&
          e.sourceImage?.startsWith("/plans/tonificar/") &&
          (e.thumbnail.startsWith("/plans/tonificar/") ||
            e.thumbnail.startsWith("https://i.ytimg.com/vi/"))
      )
    ).toBe(true);
    expect(
      requiredPlanSets(legacy, 1, 1, "beginner").some(s =>
        requiredPlanSets(tone, 1, 1, "beginner").includes(s)
      )
    ).toBe(false);
  });
  it("reemplaza solo los medios de los seis ejercicios del lunes en ambas semanas", () => {
    const original = structuredClone(tone);
    for (const week of ["first", "second"] as const) {
      const monday = original.routine[week].find(day => day.day === 1)!;
      monday.exercises.forEach((exercise, index) => {
        exercise.videoUrl = "";
        exercise.thumbnail = `/plans/tonificar/d1-e${index + 1}.webp`;
      });
    }
    const { plan: migrated, updatedExerciseIds } =
      replacePlanExerciseMediaFromDefault(original, tone, 1);
    expect(updatedExerciseIds.sort()).toEqual([
      "tone-d1-e1",
      "tone-d1-e2",
      "tone-d1-e3",
      "tone-d1-e4",
      "tone-d1-e5",
      "tone-d1-e6",
    ]);
    const monday = planDay(migrated, 1, 1)!;
    expect(monday.exercises.map(e => e.videoUrl)).toEqual([
      "https://www.youtube.com/shorts/zaSzxo6xleY?feature=share",
      "https://www.youtube.com/shorts/cytfxsIK_Hk",
      "https://www.youtube.com/shorts/QjP9g7M_Idg",
      "https://www.youtube.com/shorts/-YgMavu-_XQ",
      "https://www.youtube.com/shorts/nmqG-tIr0hc",
      "https://www.youtube.com/shorts/XCOq6lfsFAk",
    ]);
    expect(monday.exercises.map(e => getVideoEmbedUrl(e.videoUrl))).toEqual([
      "https://www.youtube-nocookie.com/embed/zaSzxo6xleY?rel=0&playsinline=1",
      "https://www.youtube-nocookie.com/embed/cytfxsIK_Hk?rel=0&playsinline=1",
      "https://www.youtube-nocookie.com/embed/QjP9g7M_Idg?rel=0&playsinline=1",
      "https://www.youtube-nocookie.com/embed/-YgMavu-_XQ?rel=0&playsinline=1",
      "https://www.youtube-nocookie.com/embed/nmqG-tIr0hc?rel=0&playsinline=1",
      "https://www.youtube-nocookie.com/embed/XCOq6lfsFAk?rel=0&playsinline=1",
    ]);
    expect(monday.exercises.map(e => e.thumbnail)).toEqual([
      "https://i.ytimg.com/vi/zaSzxo6xleY/hqdefault.jpg",
      "https://i.ytimg.com/vi/cytfxsIK_Hk/hqdefault.jpg",
      "https://i.ytimg.com/vi/QjP9g7M_Idg/hqdefault.jpg",
      "https://i.ytimg.com/vi/-YgMavu-_XQ/hqdefault.jpg",
      "https://i.ytimg.com/vi/nmqG-tIr0hc/hqdefault.jpg",
      "https://i.ytimg.com/vi/XCOq6lfsFAk/hqdefault.jpg",
    ]);
    expect(monday.sourceImage).toBe("/plans/tonificar/day-1.webp");
    expect(monday.exercises.map(e => [e.sets, e.reps])).toEqual(
      planDay(tone, 1, 1)!.exercises.map(e => [e.sets, e.reps])
    );
    expect(planDay(migrated, 1, 2)).toEqual(planDay(original, 1, 2));
    expect(planDay(migrated, 4, 1)!.exercises.map(e => e.videoUrl)).toEqual(
      monday.exercises.map(e => e.videoUrl)
    );
  });
  it("actualiza solo los cinco medios del martes y conserva las dosis y los otros días", () => {
    const ids = [
      "-MS6Z88wv5I",
      "-RngKKzbEnI",
      "kXLRGQLISG4",
      "w8Knw73_Tw8",
      "Oat8Gwahvw4",
    ];
    const original = structuredClone(tone);
    const originalSnapshot = structuredClone(original);
    for (const week of ["first", "second"] as const) {
      const tuesday = original.routine[week].find(day => day.day === 2)!;
      tuesday.exercises.forEach((exercise, index) => {
        exercise.videoUrl = "";
        exercise.thumbnail = `/plans/tonificar/d2-e${index + 1}.webp`;
      });
    }
    const { plan: migrated, updatedExerciseIds } =
      replacePlanExerciseMediaFromDefault(original, tone, 2);
    expect(updatedExerciseIds.sort()).toEqual([
      "tone-d2-e1",
      "tone-d2-e2",
      "tone-d2-e3",
      "tone-d2-e4",
      "tone-d2-e5",
    ]);
    for (const week of [1, 4]) {
      const day = planDay(migrated, week, 2)!;
      expect(day.exercises.map(e => e.videoUrl)).toEqual(
        ids.map(id => `https://www.youtube.com/shorts/${id}`)
      );
      expect(day.exercises.map(e => getVideoEmbedUrl(e.videoUrl))).toEqual(
        ids.map(
          id =>
            `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`
        )
      );
      expect(day.exercises.map(e => e.thumbnail)).toEqual(
        ids.map(id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
      );
      expect(
        day.exercises.map(e => [e.id, e.name, e.sets, e.reps, e.sourceImage])
      ).toEqual(
        planDay(originalSnapshot, week, 2)!.exercises.map(e => [
          e.id,
          e.name,
          e.sets,
          e.reps,
          e.sourceImage,
        ])
      );
      expect(day.sourceImage).toBe("/plans/tonificar/day-2.webp");
      for (const otherDay of [1, 3, 4, 5])
        expect(planDay(migrated, week, otherDay)).toEqual(
          planDay(originalSnapshot, week, otherDay)
        );
    }
    expect(requiredPlanSets(migrated, 1, 2, "beginner")).toEqual(
      requiredPlanSets(originalSnapshot, 1, 2, "beginner")
    );
    expect(
      original.routine.first.find(d => d.day === 2)!.exercises[0].videoUrl
    ).toBe("");
  });
  it("actualiza los seis videos del miércoles sin tocar dosis, reloj, portada ni otros días", () => {
    const ids = [
      "WAjen1w8kWM",
      "4Gzv-EjUclo",
      "OOoMo14FPmM",
      "S50jrJDzO4M",
      "_Plb5jSSlX4",
      "H3Iii8hPzlc",
    ];
    const stored = structuredClone(tone);
    for (const week of ["first", "second"] as const) {
      const day = stored.routine[week].find(d => d.day === 3)!;
      day.exercises.forEach((e, index) => {
        e.videoUrl = "";
        e.thumbnail = `/plans/tonificar/d3-e${index + 1}.webp`;
      });
    }
    const snapshot = structuredClone(stored);
    const { plan: migrated, updatedExerciseIds } =
      replacePlanExerciseMediaFromDefault(stored, tone, 3);
    expect(updatedExerciseIds.sort()).toEqual(
      ids.map((_, i) => `tone-d3-e${i + 1}`)
    );
    expect(migrated.coverImage).toBe(snapshot.coverImage);
    for (const week of [1, 4]) {
      const day = planDay(migrated, week, 3)!;
      expect(day.exercises.map(e => e.videoUrl)).toEqual(
        ids.map(id => `https://www.youtube.com/shorts/${id}`)
      );
      expect(day.exercises.map(e => getVideoEmbedUrl(e.videoUrl))).toEqual(
        ids.map(
          id =>
            `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`
        )
      );
      expect(day.exercises.map(e => e.thumbnail)).toEqual(
        ids.map(id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
      );
      const sourceFields = (e: (typeof day.exercises)[number]) => [
        e.id,
        e.name,
        e.sets,
        e.reps,
        e.seconds,
        e.tips,
        e.sourceImage,
      ];
      expect(day.exercises.map(sourceFields)).toEqual(
        planDay(snapshot, week, 3)!.exercises.map(sourceFields)
      );
      expect(day.exercises[4].seconds).toBe(45);
      expect(day.sourceImage).toBe("/plans/tonificar/day-3.webp");
      for (const otherDay of [1, 2, 4, 5])
        expect(planDay(migrated, week, otherDay)).toEqual(
          planDay(snapshot, week, otherDay)
        );
    }
    expect(requiredPlanSets(migrated, 1, 3, "beginner")).toEqual(
      requiredPlanSets(snapshot, 1, 3, "beginner")
    );
    expect(stored).toEqual(snapshot);
  });
  it("actualiza los cinco videos del jueves y conserva tres series de diez y los demás días", () => {
    const ids = [
      "gY2Wp2PXF8w",
      "zuID1WDdAFE",
      "-PNgCrCPcPM",
      "w8Knw73_Tw8",
      "4NWWB0f0vzQ",
    ];
    const stored = structuredClone(tone);
    for (const week of ["first", "second"] as const) {
      const day = stored.routine[week].find(d => d.day === 4)!;
      day.exercises.forEach((e, index) => {
        e.videoUrl = "";
        e.thumbnail = `/plans/tonificar/d4-e${index + 1}.webp`;
      });
    }
    const snapshot = structuredClone(stored);
    const { plan: migrated, updatedExerciseIds } =
      replacePlanExerciseMediaFromDefault(stored, tone, 4);
    expect(updatedExerciseIds.sort()).toEqual(
      ids.map((_, i) => `tone-d4-e${i + 1}`)
    );
    expect(migrated.coverImage).toBe(snapshot.coverImage);
    for (const week of [1, 4]) {
      const day = planDay(migrated, week, 4)!;
      expect(day.exercises.map(e => e.videoUrl)).toEqual(
        ids.map(id => `https://www.youtube.com/shorts/${id}`)
      );
      expect(day.exercises.map(e => getVideoEmbedUrl(e.videoUrl))).toEqual(
        ids.map(
          id =>
            `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`
        )
      );
      expect(day.exercises.map(e => e.thumbnail)).toEqual(
        ids.map(id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
      );
      const sourceFields = (e: (typeof day.exercises)[number]) => [
        e.id,
        e.name,
        e.sets,
        e.reps,
        e.tips,
        e.sourceImage,
      ];
      expect(day.exercises.map(sourceFields)).toEqual(
        planDay(snapshot, week, 4)!.exercises.map(sourceFields)
      );
      expect(
        day.exercises.every(e => e.sets === 3 && e.reps === "10 repeticiones")
      ).toBe(true);
      expect(day.sourceImage).toBe("/plans/tonificar/day-4.webp");
      for (const otherDay of [1, 2, 3, 5])
        expect(planDay(migrated, week, otherDay)).toEqual(
          planDay(snapshot, week, otherDay)
        );
    }
    expect(requiredPlanSets(migrated, 1, 4, "beginner")).toEqual(
      requiredPlanSets(snapshot, 1, 4, "beginner")
    );
    expect(stored).toEqual(snapshot);
  });
  it("calcula atrasos solo de los días propios del plan y respeta su fecha de inscripción", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T16:00:00Z"));
    expect(overdueDays(user, [], tone).map(x => x.key)).toEqual([
      "w1-d1",
      "w1-d2",
      "w1-d3",
      "w1-d4",
      "w1-d5",
    ]);
    expect(overdueDays(user, [], legacy)).toHaveLength(6);
    expect(overdueDays({ ...user, startDate: "2026-11-09" }, [], tone)).toEqual(
      []
    );
    expect(
      currentProgramDay({ ...user, startDate: "2026-10-05" }, tone)
    ).toEqual({ week: 4, day: 5 });
  });
  it("describe como opciones de la app el ciclo y descanso que las láminas no prescriben", () => {
    expect(tone.notes.join(" ")).toContain("no prescribe la duración");
    expect(tone.notes.join(" ")).toContain("90 segundos");
    expect(legacy.color).not.toBe(tone.color);
  });
});
