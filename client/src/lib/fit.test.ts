import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentProgramDay,
  dayDate,
  dayKey,
  nextMonday,
  overdueDays,
  todayInZone,
  type FitUser,
  type Progress,
} from "./fit";

const user: FitUser = {
  id: 1,
  username: "persona",
  fullName: "Persona Real",
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

describe("Calendario de la única rutina del PDF", () => {
  it("mantiene lunes a sábado y separa las semanas sin mezclar IDs", () => {
    expect(dayDate("2026-11-02", 1, 1)).toBe("2026-11-02");
    expect(dayDate("2026-11-02", 1, 7)).toBe("2026-11-08");
    expect(dayDate("2026-11-02", 4, 6)).toBe("2026-11-28");
    expect(dayKey(4, 6)).toBe("w4-d6");
  });
  it("se ubica en la semana del usuario, no en una fecha de muestra", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T16:00:00Z"));
    expect(todayInZone(user.timezone)).toBe("2026-11-05");
    expect(currentProgramDay(user)).toEqual({ week: 1, day: 4 });
    expect(currentProgramDay({ ...user, startDate: "2026-11-09" })).toEqual({
      week: 1,
      day: 1,
    });
  });
  it("no marca días futuros ni domingos como sesiones atrasadas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T16:00:00Z"));
    const pending = overdueDays(user, []);
    expect(pending.map(x => x.key)).toEqual([
      "w1-d1",
      "w1-d2",
      "w1-d3",
      "w1-d4",
    ]);
    expect(overdueDays({ ...user, startDate: "2026-11-09" }, [])).toEqual([]);
  });
  it("respeta hora configurada y excluye sesiones cumplidas", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00Z"));
    const done: Progress = {
      dayKey: "w1-d2",
      level: "beginner",
      completedSets: [],
      cardioDone: true,
      warmupDone: true,
      completedAt: "2026-11-03T13:00:00Z",
      updatedAt: "2026-11-03T13:00:00Z",
    };
    expect(overdueDays(user, [done]).map(x => x.key)).toEqual([
      "w1-d1",
      "w1-d3",
    ]);
  });
  it("propone un lunes como fecha de inicio", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T16:00:00Z"));
    expect(new Date(`${nextMonday()}T12:00:00`).getDay()).toBe(1);
  });
});
