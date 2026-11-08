import { lazy, Suspense } from "react";
import { Route, Switch, useSearch } from "wouter";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { FitProvider } from "./contexts/FitContext";
import Home from "./pages/Home";
import Access from "./pages/Access";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";

const Program = lazy(() => import("./pages/Program"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const PlanAdmin = lazy(() => import("./pages/PlanAdmin"));

function InitialPage() {
  const params = new URLSearchParams(useSearch());
  return params.has("semana") || params.has("dia") ? <Home /> : <Plans />;
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
            <Route path="/" component={InitialPage} />
            <Route path="/planes" component={Plans} />
            <Route path="/entrenamiento" component={Home} />
            <Route path="/programa" component={Program} />
            <Route path="/progreso" component={Progress} />
            <Route path="/ajustes" component={Settings} />
            <Route path="/acceso" component={Access} />
            <Route path="/admin" component={Admin} />
            <Route path="/admin/planes" component={PlanAdmin} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </FitProvider>
    </ErrorBoundary>
  );
}
