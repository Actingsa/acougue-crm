import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { registerServiceWorker } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_DISMISSED_KEY = "carnecrm:install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PWAManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  // Service worker registration + update prompt
  useEffect(() => {
    registerServiceWorker((reload) => {
      toast("Nova versão disponível", {
        description: "Atualize para receber as melhorias mais recentes.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => reload(),
        },
        icon: <RefreshCw className="h-4 w-4" />,
      });
    });
  }, []);

  // Install prompt capture (Android/Desktop Chrome/Edge)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissed) return;
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — show manual hint once
    if (isIos() && !isStandalone()) {
      const t = setTimeout(() => setShowIosHint(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => toast.success("Conexão restabelecida");
    const onOffline = () =>
      toast.warning("Você está offline", {
        description: "Os dados já carregados continuam disponíveis.",
      });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    setInstallEvent(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      toast.success("Aplicativo instalado");
    }
    setInstallEvent(null);
  };

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm border border-border bg-card p-4 shadow-2xl sm:left-auto sm:right-4">
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Instalar aplicativo
          </p>
          <h3 className="mt-1 text-sm font-bold tracking-tight text-foreground">
            Use Carne.CRM como app
          </h3>
          {installEvent ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Acesso direto pela tela inicial, mais rápido e funciona offline.
              </p>
              <button
                onClick={install}
                className="mt-3 w-full bg-primary px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground hover:brightness-110"
              >
                Instalar agora
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              No iPhone, toque em <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
