import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  saveToken,
  type ContentOverride,
  type FitUser,
  type Progress,
} from "@/lib/fit";

interface FitContextValue {
  user: FitUser | null;
  loading: boolean;
  error: string | null;
  progress: Progress[];
  overrides: ContentOverride[];
  refresh: () => Promise<void>;
  refreshContent: () => Promise<void>;
  authenticate: (path: "/login" | "/register", body: unknown) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (body: unknown) => Promise<void>;
  writeProgress: (
    key: string,
    body: Pick<Progress, "completedSets" | "cardioDone" | "warmupDone">
  ) => Promise<Progress>;
}
const Context = createContext<FitContextValue | null>(null);
export function FitProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FitUser | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [overrides, setOverrides] = useState<ContentOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshContent = useCallback(async () => {
    const result = await api<{ overrides: ContentOverride[] }>("/content");
    setOverrides(result.overrides);
  }, []);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await api<{ user: FitUser | null }>("/me");
      setUser(result.user);
      if (result.user) {
        const resultProgress = await api<{ progress: Progress[] }>("/progress");
        setProgress(resultProgress.progress);
      } else setProgress([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar la cuenta."
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    void refreshContent().catch(() => {
      /* Original PDF content remains available. */
    });
  }, [refresh, refreshContent]);
  const authenticate = async (path: "/login" | "/register", body: unknown) => {
    const result = await api<{ user: FitUser; token: string }>(path, {
      method: "POST",
      body,
    });
    saveToken(result.token);
    setUser(result.user);
    setError(null);
    const resultProgress = await api<{ progress: Progress[] }>("/progress");
    setProgress(resultProgress.progress);
  };
  const logout = async () => {
    await api("/logout", { method: "POST" });
    saveToken(null);
    setUser(null);
    setProgress([]);
  };
  const updateProfile = async (body: unknown) => {
    const result = await api<{ user: FitUser }>("/profile", {
      method: "PUT",
      body,
    });
    setUser(result.user);
  };
  const writeProgress = async (
    key: string,
    body: Pick<Progress, "completedSets" | "cardioDone" | "warmupDone">
  ) => {
    const result = await api<{ progress: Progress }>(`/progress/${key}`, {
      method: "PUT",
      body,
    });
    setProgress(old => [...old.filter(p => p.dayKey !== key), result.progress]);
    return result.progress;
  };
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        progress,
        overrides,
        refresh,
        refreshContent,
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
  const value = useContext(Context);
  if (!value) throw new Error("FitProvider is required");
  return value;
}
