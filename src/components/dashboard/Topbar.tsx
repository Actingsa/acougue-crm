import { useEffect, useState } from "react";
import { queue } from "@/lib/pdv-offline";

export function Topbar({ section }: { section: string }) {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const upOn = () => setOnline(true);
    const upOff = () => setOnline(false);
    const upQ = () => setPending(queue.list().length);
    window.addEventListener("online", upOn);
    window.addEventListener("offline", upOff);
    window.addEventListener("pdv-queue-change", upQ);
    upQ();
    return () => {
      window.removeEventListener("online", upOn);
      window.removeEventListener("offline", upOff);
      window.removeEventListener("pdv-queue-change", upQ);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Terminal / {section}
        </div>
        <span
          className={
            "inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-[10px] uppercase " +
            (online
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning")
          }
        >
          <span
            className={
              "size-1.5 rounded-full " +
              (online ? "animate-pulse bg-success" : "bg-warning")
            }
          />
          {online ? "Sistema online" : "Modo offline"}
        </span>
        {pending > 0 && (
          <span className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
            {pending} venda{pending === 1 ? "" : "s"} em fila
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <input
          placeholder="Buscar corte, lote, cliente…"
          className="hidden w-64 border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-primary md:block"
        />
        <div className="flex size-9 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] uppercase">
          OP
        </div>
      </div>
    </header>
  );
}
