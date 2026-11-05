import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useFit } from "@/contexts/FitContext";
import { dateLabel, overdueDays, todayInZone } from "@/lib/fit";
import { LEVELS } from "@shared/routine";
import { toast } from "sonner";

const links = [
  { to: "/", label: "Mi entrenamiento", icon: Dumbbell },
  { to: "/programa", label: "Mi programa", icon: CalendarDays },
  { to: "/progreso", label: "Mi progreso", icon: TrendingUp },
  { to: "/ajustes", label: "Mi cuenta", icon: Settings2 },
];
export function Brand() {
  return (
    <Link href="/" className="brand">
      <img src="/ritmo-mark.svg" alt="" />
      <span>
        ritmo<span className="brand-light">fit</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function FitLayout({
  children,
  title = "Mi entrenamiento",
}: {
  children: ReactNode;
  title?: string;
}) {
  const [location, navigate] = useLocation();
  const { user, progress, logout, error, refresh } = useFit();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const pending = user ? overdueDays(user, progress) : [];
  const initials =
    user?.fullName
      .split(" ")
      .slice(0, 2)
      .map(x => x[0])
      .join("")
      .toUpperCase() ?? "RF";
  const signOut = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Sesión cerrada.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <span className="nav-caption">TU ESPACIO</span>
        <nav className="side-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              href={to}
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${location === to ? "active" : ""}`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {location === to && <span className="nav-active-dot" />}
            </Link>
          ))}
          {user?.role === "admin" && (
            <>
              <span className="nav-caption admin-caption">GESTIÓN</span>
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`nav-link ${location === "/admin" ? "active" : ""}`}
              >
                <ShieldCheck size={19} />
                <span>Administración</span>
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-program">
          <span className="tiny-pill">
            <Sparkles size={12} /> TU PROGRAMA
          </span>
          <h3>
            Un cambio real.
            <br />A tu ritmo.
          </h3>
          <p>
            4 semanas para construir
            <br />
            una mejor versión de ti.
          </p>
          <Link href="/programa">
            Ver mi programa <span>↗</span>
          </Link>
        </div>
        <div className="sidebar-bottom">
          <a
            href="/programa-perdida-de-peso.pdf"
            target="_blank"
            rel="noreferrer"
            className="help-link"
          >
            <HelpCircle size={17} /> Guía original del programa ↗
          </a>
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div>
              <strong>
                {user ? user.fullName.split(" ")[0] : "Entrena a tu ritmo"}
              </strong>
              <span>
                {user ? LEVELS[user.level].label : "Tu constancia cuenta"}
              </span>
            </div>
            {user && (
              <button
                className="icon-button"
                aria-label="Cerrar sesión"
                onClick={signOut}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <LayoutDashboard size={17} className="breadcrumb-icon" />
            <span>Mi espacio</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="header-date">
              {dateLabel(todayInZone(user?.timezone), true)}
            </span>
            <div className="notification-wrap">
              <button
                className="icon-button bell-button"
                aria-label="Recordatorios"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {user?.remindersEnabled && pending.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h4>Tus recordatorios</h4>
                  {!user ? (
                    <p>Inicia sesión para ver tus sesiones pendientes.</p>
                  ) : !user.remindersEnabled ? (
                    <p>
                      Los recordatorios están desactivados. Puedes activarlos en
                      Mi cuenta.
                    </p>
                  ) : pending.length ? (
                    <>
                      <p>
                        Tienes {pending.length}{" "}
                        {pending.length === 1
                          ? "sesión pendiente"
                          : "sesiones pendientes"}
                        . No necesitas compensarlas todas de golpe.
                      </p>
                      <Link
                        href="/programa"
                        onClick={() => setNotifications(false)}
                        className="text-link"
                      >
                        Organizar mi semana →
                      </Link>
                    </>
                  ) : (
                    <p>No tienes rutinas atrasadas. Sigue a tu ritmo.</p>
                  )}
                </div>
              )}
            </div>
            <span className="header-action-divider" />
            {user ? (
              <Link href="/ajustes" className="account-button">
                <span className="avatar small">{initials}</span>
                <span>{user.fullName.split(" ")[0]}</span>
                <ChevronDown size={14} />
              </Link>
            ) : (
              <Link href="/acceso" className="button small secondary">
                Iniciar sesión <span>↗</span>
              </Link>
            )}
          </div>
        </header>
        {error && (
          <div className="connection-alert">
            {error}
            <button onClick={() => void refresh()}>Reintentar</button>
          </div>
        )}
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          <span>ritmofit · La constancia le gana al perfeccionismo.</span>
          <span>Basado en tu programa Pérdida de Peso</span>
        </footer>
      </div>
    </div>
  );
}
