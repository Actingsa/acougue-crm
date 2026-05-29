import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Erro 404</p>
        <h1 className="mt-4 text-5xl font-black tracking-tighter text-foreground">
          PÁGINA NÃO LOCALIZADA
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          O recurso solicitado não existe ou foi movido para outra unidade.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-primary px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            Voltar ao Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Falha de Sistema</p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">
          Esta operação não pôde ser concluída
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-primary px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110"
          >
            Tentar Novamente
          </button>
          <a
            href="/"
            className="border border-border px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-foreground hover:bg-white/5"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#09090b" },
      { title: "CarneOS — ERP de Precisão para Açougues Premium" },
      {
        name: "description",
        content:
          "Plataforma SaaS multiempresa para açougues, frigoríficos e redes de varejo premium de carnes. Rendimento, rastreabilidade, PDV offline e inteligência operacional em tempo real.",
      },
      { name: "author", content: "CarneOS Systems" },
      { property: "og:title", content: "CarneOS — ERP de Precisão para Açougues Premium" },
      {
        property: "og:description",
        content:
          "ERP de precisão para boutiques de carne e frigoríficos high-end. Multi-tenant, offline-ready, IA preditiva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CarneOS — ERP de Precisão para Açougues Premium" },
      { name: "description", content: "Lovable Generated Project" },
      { property: "og:description", content: "Lovable Generated Project" },
      { name: "twitter:description", content: "Lovable Generated Project" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ebfe26a7-de30-4b35-b592-bb4f68de4243/id-preview-329dc68a--701a99ab-8bcc-40e6-8254-d372ae2591ff.lovable.app-1779415657073.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ebfe26a7-de30-4b35-b592-bb4f68de4243/id-preview-329dc68a--701a99ab-8bcc-40e6-8254-d372ae2591ff.lovable.app-1779415657073.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
