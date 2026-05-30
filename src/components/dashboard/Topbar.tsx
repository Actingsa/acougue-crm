export function DashboardTopbar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Terminal / {title}
        </div>
        <span className="inline-flex items-center gap-2 border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Online
        </span>
      </div>
      <div className="flex items-center gap-3">{action}</div>
    </header>
  );
}
