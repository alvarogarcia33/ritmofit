import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation, useSearch } from "wouter";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { FitProvider, useFit } from "./contexts/FitContext";
import Home from "./pages/Home";
import Access from "./pages/Access";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";

const Program = lazy(() => import("./pages/Program"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const PlanAdmin = lazy(() => import("./pages/PlanAdmin"));
const ExerciseDemosAdmin = lazy(() => import("./pages/ExerciseDemosAdmin"));
const PersonalPlanBuilder = lazy(() => import("./pages/PersonalPlanBuilder"));

function InitialPage() {
  const params = new URLSearchParams(useSearch());
  return params.has("semana") || params.has("dia") ? <Home /> : <Plans />;
}

function SessionRecovery({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <main className="loading-panel" role="alert">
      <p>No pudimos cargar tu sesión y tus planes: {error}</p>
      <button className="button primary" onClick={retry}>
        Reintentar
      </button>
    </main>
  );
}

function AccessPage() {
  const { user, loading, planLoading, error, refresh } = useFit();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (user && !loading && !planLoading)
      navigate("/planes", { replace: true });
  }, [user, loading, planLoading, error, navigate]);
  if (user && error && planLoading)
    return <SessionRecovery error={error} retry={() => void refresh()} />;
  if (loading || (user && planLoading))
    return <div className="loading-panel">Verificando tu acceso…</div>;
  return user ? null : <Access />;
}

function LoginRequired({ children }: { children: ReactNode }) {
  const { user, loading, planLoading, error, refresh } = useFit();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && !user) navigate("/acceso", { replace: true });
  }, [user, loading, navigate]);
  if (user && error && planLoading)
    return <SessionRecovery error={error} retry={() => void refresh()} />;
  if (loading || (user && planLoading) || !user)
    return (
      <div className="loading-panel">Inicia sesión para abrir tus planes…</div>
    );
  return <>{children}</>;
}

function ProtectedNotFound() {
  return (
    <LoginRequired>
      <NotFound />
    </LoginRequired>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FitProvider>
        <Toaster richColors position="bottom-center" />
        <Suspense
          fallback={<div className="loading-panel">Preparando tu espacio…</div>}
        >
          <Switch>
            <Route path="/acceso" component={AccessPage} />
            <Route
              path="/"
              component={() => (
                <LoginRequired>
                  <InitialPage />
                </LoginRequired>
              )}
            />
            <Route
              path="/planes"
              component={() => (
                <LoginRequired>
                  <Plans />
                </LoginRequired>
              )}
            />
            <Route
              path="/plan-personal"
              component={() => (
                <LoginRequired>
                  <PersonalPlanBuilder />
                </LoginRequired>
              )}
            />
            <Route
              path="/entrenamiento"
              component={() => (
                <LoginRequired>
                  <Home />
                </LoginRequired>
              )}
            />
            <Route
              path="/programa"
              component={() => (
                <LoginRequired>
                  <Program />
                </LoginRequired>
              )}
            />
            <Route
              path="/progreso"
              component={() => (
                <LoginRequired>
                  <Progress />
                </LoginRequired>
              )}
            />
            <Route
              path="/ajustes"
              component={() => (
                <LoginRequired>
                  <Settings />
                </LoginRequired>
              )}
            />
            <Route
              path="/admin"
              component={() => (
                <LoginRequired>
                  <Admin />
                </LoginRequired>
              )}
            />
            <Route
              path="/admin/demostraciones"
              component={() => (
                <LoginRequired>
                  <ExerciseDemosAdmin />
                </LoginRequired>
              )}
            />
            <Route
              path="/admin/planes"
              component={() => (
                <LoginRequired>
                  <PlanAdmin />
                </LoginRequired>
              )}
            />
            <Route component={ProtectedNotFound} />
          </Switch>
        </Suspense>
      </FitProvider>
    </ErrorBoundary>
  );
}
