import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CompanyProvider } from "@/hooks/use-company";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { drainQueue } from "@/lib/pdv-offline";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, navigate]);

  // Try to flush offline queue whenever we come back online or mount with session.
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (navigator.onLine) drainQueue();
    };
    tick();
    window.addEventListener("online", tick);
    const id = window.setInterval(tick, 20_000);
    return () => {
      window.removeEventListener("online", tick);
      clearInterval(id);
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Verificando credenciais…
        </p>
      </div>
    );
  }

  return (
    <CompanyProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </CompanyProvider>
  );
}
