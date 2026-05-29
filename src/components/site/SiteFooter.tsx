export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <div className="mb-2 text-2xl font-black tracking-tighter">
            <span className="text-primary">CARNE</span>
            <span className="text-foreground">OS</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2026 CarneOS Systems · High-Precision Meat Tech
          </p>
        </div>
        <div className="flex gap-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex flex-col gap-2">
            <span className="text-foreground/40">Produto</span>
            <a href="#" className="hover:text-primary">Dashboard</a>
            <a href="#" className="hover:text-primary">PDV</a>
            <a href="#" className="hover:text-primary">Rastreabilidade</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-foreground/40">Empresa</span>
            <a href="#" className="hover:text-primary">Sobre</a>
            <a href="#" className="hover:text-primary">Contato</a>
            <a href="#" className="hover:text-primary">LGPD</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
