import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  saveToken,
  SESSION_EXPIRED_EVENT,
  type ContentOverride,
  type FitUser,
  type Progress,
} from "@/lib/fit";
import {
  DEFAULT_PLANS,
  LEGACY_PLAN_ID,
  type PlanEnrollment,
  type TrainingPlan,
} from "@shared/programs";

interface FitContextValue {
  user: FitUser | null;
  planUser: FitUser | null;
  loading: boolean;
  planLoading: boolean;
  error: string | null;
  progress: Progress[];
  overrides: ContentOverride[];
  plans: TrainingPlan[];
  plan: TrainingPlan;
  planId: string;
  enrollment: PlanEnrollment | null;
  enrollments: PlanEnrollment[];
  refresh: () => Promise<void>;
  refreshContent: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  selectPlan: (
    id: string,
    preferences?: Partial<Omit<PlanEnrollment, "planId">>
  ) => Promise<void>;
  updatePlanPreferences: (
    preferences: Partial<Omit<PlanEnrollment, "planId">>
  ) => Promise<void>;
  authenticate: (path: "/login" | "/register", body: unknown) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (body: unknown) => Promise<void>;
  writeProgress: (
    key: string,
    body: Pick<Progress, "completedSets" | "cardioDone" | "warmupDone">
  ) => Promise<Progress>;
}
const Context = createContext<FitContextValue | null>(null);
const obsoleteGuestPlanKey = "ritmo-guest-plan";

export function FitProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FitUser | null>(null);
  const [plans, setPlans] = useState<TrainingPlan[]>(DEFAULT_PLANS);
  const [planId, setPlanId] = useState(LEGACY_PLAN_ID);
  const [enrollments, setEnrollments] = useState<PlanEnrollment[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [overrides, setOverrides] = useState<ContentOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  const active = useRef(planId);
  const plan = plans.find(p => p.id === planId) ?? plans[0] ?? DEFAULT_PLANS[0];
  const enrollment = enrollments.find(e => e.planId === planId) ?? null;
  const planUser = user
    ? {
        ...user,
        startDate: enrollment?.startDate ?? user.startDate,
        level: enrollment?.level ?? user.level,
      }
    : null;
  const refreshContent = useCallback(async () => {
    const r = await api<{ overrides: ContentOverride[] }>("/content");
    setOverrides(r.overrides);
  }, []);
  const refreshPlans = useCallback(async () => {
    const r = await api<{ plans: TrainingPlan[] }>("/plans");
    setPlans(r.plans);
  }, []);
  const loadForAccount = useCallback(
    async (account: FitUser | null, targetEpoch: number) => {
      if (!account) {
        if (epoch.current === targetEpoch) {
          saveToken(null);
          try {
            localStorage.removeItem(obsoleteGuestPlanKey);
          } catch {}
          setEnrollments([]);
          setProgress([]);
          setPlans([]);
          setOverrides([]);
          active.current = LEGACY_PLAN_ID;
          setPlanId(LEGACY_PLAN_ID);
        }
        return;
      }
      const state = await api<{
        activePlanId: string;
        enrollments: PlanEnrollment[];
      }>("/plan-state");
      const r = await api<{ progress: Progress[] }>(
        `/plans/${encodeURIComponent(state.activePlanId)}/progress`
      );
      if (epoch.current !== targetEpoch) return;
      active.current = state.activePlanId;
      setPlanId(state.activePlanId);
      setEnrollments(state.enrollments);
      setProgress(r.progress);
      setProgressReady(true);
    },
    []
  );
  const refresh = useCallback(async () => {
    const n = ++epoch.current;
    setError(null);
    setPlanLoading(true);
    setProgressReady(false);
    try {
      const r = await api<{ user: FitUser | null }>("/me");
      if (epoch.current !== n) return;
      setUser(r.user);
      if (r.user) {
        await refreshPlans();
        await refreshContent();
        await loadForAccount(r.user, n);
      } else {
        await loadForAccount(null, n);
      }
    } catch (e) {
      if (epoch.current === n)
        setError(
          e instanceof Error ? e.message : "No se pudo cargar la cuenta."
        );
    } finally {
      if (epoch.current === n) {
        setLoading(false);
        setPlanLoading(false);
      }
    }
  }, [loadForAccount, refreshContent, refreshPlans]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const expireSession = () => {
      ++epoch.current;
      saveToken(null);
      setUser(null);
      setProgress([]);
      setEnrollments([]);
      setPlans([]);
      setOverrides([]);
      setPlanId(LEGACY_PLAN_ID);
      active.current = LEGACY_PLAN_ID;
      setPlanLoading(false);
      setProgressReady(false);
      setLoading(false);
      setError(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, []);
  const authenticate = async (path: "/login" | "/register", body: unknown) => {
    const n = ++epoch.current;
    setError(null);
    setPlanLoading(true);
    setProgressReady(false);
    try {
      const r = await api<{ user: FitUser; token: string }>(path, {
        method: "POST",
        body,
      });
      saveToken(r.token);
      setProgress([]);
      setEnrollments([]);
      setUser(r.user);
      setError(null);
      await refreshPlans();
      await refreshContent();
      await loadForAccount(r.user, n);
    } catch (e) {
      if (epoch.current === n)
        setError(
          e instanceof Error ? e.message : "No se pudo cargar tu acceso."
        );
      throw e;
    } finally {
      if (epoch.current === n) setPlanLoading(false);
    }
  };
  const logout = async () => {
    await api("/logout", { method: "POST" });
    ++epoch.current;
    saveToken(null);
    setUser(null);
    setProgress([]);
    setEnrollments([]);
    setPlans([]);
    setOverrides([]);
    try {
      localStorage.removeItem(obsoleteGuestPlanKey);
    } catch {}
    active.current = LEGACY_PLAN_ID;
    setPlanId(LEGACY_PLAN_ID);
    setPlanLoading(false);
    setProgressReady(false);
  };
  const updateProfile = async (body: unknown) => {
    const r = await api<{ user: FitUser }>("/profile", { method: "PUT", body });
    setUser(r.user);
  };
  const selectPlan = async (
    id: string,
    preferences: Partial<Omit<PlanEnrollment, "planId">> = {}
  ) => {
    if (!user) throw new Error("Inicia sesión para acceder a tus planes.");
    if (!plans.some(p => p.id === id))
      throw new Error("Este plan no está publicado en la biblioteca.");
    const n = ++epoch.current;
    const previousReady = progressReady;
    let selectionSaved = false;
    setPlanLoading(true);
    setProgressReady(false);
    setError(null);
    try {
      const state = await api<{
        activePlanId: string;
        enrollments: PlanEnrollment[];
      }>(`/plans/${encodeURIComponent(id)}/enrollment`, {
        method: "PUT",
        body: preferences,
      });
      selectionSaved = true;
      const r = await api<{ progress: Progress[] }>(
        `/plans/${encodeURIComponent(id)}/progress`
      );
      if (epoch.current !== n) return;
      active.current = id;
      setPlanId(id);
      setEnrollments(state.enrollments);
      setProgress(r.progress);
      setProgressReady(true);
      if (id === LEGACY_PLAN_ID) {
        const me = await api<{ user: FitUser }>("/me");
        if (epoch.current === n) setUser(me.user);
      }
    } catch (e) {
      if (epoch.current === n) {
        if (!selectionSaved) setProgressReady(previousReady);
        setError(
          e instanceof Error ? e.message : "No se pudo seleccionar el plan."
        );
      }
      throw e;
    } finally {
      if (epoch.current === n) setPlanLoading(false);
    }
  };
  const updatePlanPreferences = (
    preferences: Partial<Omit<PlanEnrollment, "planId">>
  ) => selectPlan(planId, preferences);
  const writeProgress = async (
    key: string,
    body: Pick<Progress, "completedSets" | "cardioDone" | "warmupDone">
  ) => {
    if (planLoading || !progressReady)
      throw new Error(
        "Reintenta cargar el progreso del plan antes de guardar cambios."
      );
    const id = planId,
      n = epoch.current;
    const r = await api<{ progress: Progress }>(
      `/plans/${encodeURIComponent(id)}/progress/${encodeURIComponent(key)}`,
      { method: "PUT", body }
    );
    if (epoch.current === n && active.current === id)
      setProgress(old => [...old.filter(p => p.dayKey !== key), r.progress]);
    return r.progress;
  };
  return (
    <Context.Provider
      value={{
        user,
        planUser,
        loading,
        planLoading: planLoading || (!!user && !progressReady),
        error,
        progress,
        overrides,
        plans,
        plan,
        planId,
        enrollment,
        enrollments,
        refresh,
        refreshContent,
        refreshPlans,
        selectPlan,
        updatePlanPreferences,
        authenticate,
        logout,
        updateProfile,
        writeProgress,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFit() {
  const v = useContext(Context);
  if (!v) throw new Error("FitProvider is required");
  return v;
}
