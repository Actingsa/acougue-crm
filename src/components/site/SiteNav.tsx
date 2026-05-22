import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-10">
        <Link to="/" className="flex items-center gap-2 font-black tracking-tighter text-2xl">
          <span className="text-primary">CARNE</span>
          <span className="text-foreground">OS</span>
        </Link>
        <div className="hidden gap-6 font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
          <a href="#operacoes" className="transition-colors hover:text-primary">Operações</a>
          <a href="#inteligencia" className="transition-colors hover:text-primary">Inteligência</a>
          <a href="#planos" className="transition-colors hover:text-primary">Planos</a>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:bg-white/5"
        >
          Login
        </Link>
        <Link
          to="/dashboard"
          className="bg-primary px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110"
        >
          Demo_Live
        </Link>
      </div>
    </nav>
  );
}
