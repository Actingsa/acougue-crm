// Guarded service worker registration wrapper.
// Per the Lovable PWA skill: never register in dev, iframe, or Lovable preview.
import { Workbox } from "workbox-window";

const SW_URL = "/sw.js";

function isRestrictedHost(): boolean {
  if (typeof window === "undefined") return true;
  const { hostname } = window.location;
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (new URLSearchParams(window.location.search).has("sw") &&
      new URLSearchParams(window.location.search).get("sw") === "off") return false;
  if (isRestrictedHost()) return false;
  return true;
}

async function unregisterMatching(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => r.active?.scriptURL?.endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export type UpdateHandler = (reload: () => void) => void;

export function registerServiceWorker(onUpdate?: UpdateHandler): void {
  if (!shouldRegister()) {
    void unregisterMatching();
    return;
  }
  const wb = new Workbox(SW_URL);
  wb.addEventListener("waiting", () => {
    onUpdate?.(() => {
      wb.addEventListener("controlling", () => window.location.reload());
      void wb.messageSkipWaiting();
    });
  });
  void wb.register();
}
