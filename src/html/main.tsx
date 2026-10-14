/**
 * Point d'entrée de la version HTML autonome (un seul fichier, sans serveur).
 * Mêmes écrans que l'application Next.js : seule la navigation change (hash).
 */
import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { Providers } from "@/components/shell/providers";
import { tr } from "@/i18n/core";
import { PublicShell } from "@/components/shell/public-shell";
import { RoleShell } from "@/components/shell/role-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/lang";
import { HashRouter, Link, matchRoute, useRoute } from "./nav";
import { ROUTES } from "./routes";

function App() {
  const { path } = useRoute();
  const lang = useLang((s) => s.lang);
  const route = ROUTES.find((r) => matchRoute(r.pattern, path));
  useEffect(() => {
    document.title = route && route.pattern !== "/" ? `${tr(route.title)} · Filémoire` : tr("Filémoire — Une question à la fois, une vie à transmettre.");
  }, [route, lang]);
  if (!route)
    return (
      <PublicShell>
        <div className="container-page max-w-2xl py-16">
          <h1 className="sr-only">Page introuvable</h1>
          <Alert tone="warning" title="Cette page n'existe pas" action={<Button asChild><Link href="/">Retour à l'accueil</Link></Button>}>
            Le lien est peut-être incomplet.
          </Alert>
        </div>
      </PublicShell>
    );
  const page = <route.Component key={path} />;
  return route.shell === "public" ? <PublicShell>{page}</PublicShell> : <RoleShell role={route.shell}>{page}</RoleShell>;
}

createRoot(document.getElementById("root")!).render(
  <HashRouter patterns={ROUTES.map((r) => r.pattern)}>
    <Providers>
      <App />
    </Providers>
  </HashRouter>,
);
