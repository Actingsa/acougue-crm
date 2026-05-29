import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CompanyProvider, useCompany } from "@/hooks/use-company";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { drainQueue } from "@/lib/pdv-offline";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const tick = () => navigator.onLine && drainQueue();
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
          <LicenseGate>
            <Outlet />
          </LicenseGate>
        </div>
      </div>
    </CompanyProvider>
  );
}

function LicenseGate({ children }: { children: React.ReactNode }) {
  const { current, licenseActive, isPlatformAdmin, loading } = useCompany();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Super admin sempre passa, e a área /admin nunca é bloqueada
  if (isPlatformAdmin || path.startsWith("/admin")) return <>{children}</>;
  if (loading || !current) return <>{children}</>;
  if (licenseActive) return <>{children}</>;

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg border border-primary/40 bg-surface p-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          Licença {current.license_status}
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tighter">
          Acesso suspenso
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          A licença da empresa <span className="font-bold text-foreground">{current.name}</span> está
          inativa. Entre em contato com o administrador da plataforma CarneOS para regularizar.
        </p>
        <a
          href="mailto:clessiors@gmail.com"
          className="mt-6 inline-block bg-primary px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground"
        >
          Falar com o Super Admin
        </a>
      </div>
    </main>
  );
}
