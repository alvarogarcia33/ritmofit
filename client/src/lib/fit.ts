import type { Level } from "@shared/routine";
import { planDays, type TrainingPlan } from "@shared/programs";

export type FitUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: "user" | "admin";
  level: Level;
  startDate: string;
  reminderTime: string;
  remindersEnabled: boolean;
  timezone: string;
  createdAt: string;
  lastLogin: string | null;
};
export type Progress = {
  dayKey: string;
  level?: Level;
  completedSets: string[];
  cardioDone: boolean;
  warmupDone: boolean;
  completedAt: string | null;
  updatedAt: string;
};
export type ContentOverride = {
  exerciseId: string;
  name: string;
  videoUrl: string;
  tips: string;
};

const TOKEN_KEY = "ritmo-session";
export function saveToken(token: string | null) {
  try {
    token
      ? sessionStorage.setItem(TOKEN_KEY, token)
      : sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Cookies remain the primary session. */
  }
}
export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    /* Use the HttpOnly cookie. */
  }
  const response = await fetch(`/api/fit${path}`, {
    method: options?.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Ritmo-Request": "1",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options?.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "No se pudo conectar con el servidor." }));
  if (!response.ok)
    throw new Error(
      data.error ?? "No se pudo guardar el cambio. Inténtalo de nuevo."
    );
  return data as T;
}
export function dateOnly(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
export function todayInZone(timezone?: string) {
  if (!timezone) return dateOnly(new Date());
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function nextMonday() {
  const now = new Date();
  const weekday = now.getDay();
  const delta = weekday === 1 ? 0 : (8 - weekday) % 7;
  now.setDate(now.getDate() + delta);
  return dateOnly(now);
}
export function dayDate(start: string, week: number, day: number) {
  const result = new Date(`${start}T12:00:00`);
  result.setDate(result.getDate() + (week - 1) * 7 + day - 1);
  return dateOnly(result);
}
export function dayKey(week: number, day: number) {
  return `w${week}-d${day}`;
}
export function dateLabel(date: string, short = false) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "es",
    short
      ? { day: "numeric", month: "short" }
      : { weekday: "long", day: "numeric", month: "long" }
  );
}
export function currentProgramDay(user: FitUser | null, plan?: TrainingPlan) {
  if (!user) return { week: 1, day: 1 };
  const difference = Math.round(
    (new Date(`${todayInZone(user.timezone)}T12:00:00`).getTime() -
      new Date(`${user.startDate}T12:00:00`).getTime()) /
      86400000
  );
  if (difference < 0) return { week: 1, day: 1 };
  const weeks = plan?.weeks ?? 4;
  if (difference > weeks * 7 - 1)
    return {
      week: weeks,
      day: plan ? (planDays(plan, weeks).at(-1)?.day ?? 1) : 6,
    };
  return { week: Math.floor(difference / 7) + 1, day: (difference % 7) + 1 };
}
export function overdueDays(
  user: FitUser,
  progress: Progress[],
  plan?: TrainingPlan
) {
  const today = todayInZone(user.timezone);
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: user.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const items: { week: number; day: number; date: string; key: string }[] = [];
  for (let week = 1; week <= (plan?.weeks ?? 4); week++) {
    for (const day of plan
      ? planDays(plan, week).map(d => d.day)
      : [1, 2, 3, 4, 5, 6]) {
      const date = dayDate(user.startDate, week, day);
      const key = dayKey(week, day);
      if (
        (date < today || (date === today && localTime >= user.reminderTime)) &&
        !progress.find(p => p.dayKey === key)?.completedAt
      ) {
        items.push({ week, day, date, key });
      }
    }
  }
  return items;
}
