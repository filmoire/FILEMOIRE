"use client";

import { Gift, Lock, Mic, PenLine, ShieldCheck, Users } from "lucide-react";
import { Hydrated } from "@/components/shell/providers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { pkg } from "@/lib/catalog";
import { Link, useNav, useRouteParam } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

export function InvitationScreen() {
  return (
    <Hydrated>
      <Invitation />
    </Hydrated>
  );
}

function Invitation() {
  const tok = useRouteParam("token") ?? "";
  const projects = useDemo((s) => s.projects);
  const orders = useDemo((s) => s.orders);
  const nav = useNav();
  const asNarrator = projects.find((p) => p.invitation.token === tok);
  const asEditor = projects.find((p) => p.editors.some((e) => e.token === tok));

  if (asNarrator) {
    const p = asNarrator;
    const o = orders.find((x) => x.id === p.orderId);
    const st = p.invitation.status;
    const accept = () => {
      const r = useDemo.getState().acceptInvitation(tok);
      if (r.ok) nav.push(p.onboarded ? "/narrateur" : "/narrateur/bienvenue");
    };
    return (
      <div className="container-page max-w-3xl py-12">
        <div className="card overflow-hidden">
          <div className="bg-prune px-6 py-8 text-creme sm:px-10">
            <Gift className="size-8 text-or" aria-hidden />
            <p className="mt-4 text-sm uppercase tracking-[0.14em] text-or-100">Une invitation pour {p.narrator.firstName}</p>
            <h1 className="mt-2 !text-creme">{p.buyerName} vous offre Filémoire</h1>
            {o?.message && <p className="mt-4 font-serif text-xl italic text-creme/90">« {o.message} »</p>}
          </div>
          <div className="space-y-6 p-6 sm:p-10">
            {st === "envoyee" && (
              <>
                <p className="text-lg">
                  {pkg(p.packageCode).name} : {p.length} questions, une à la fois, pour raconter votre vie à votre rythme. À la fin, un livre que vous aurez validé vous-même.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    [PenLine, "Écrire ou parler", "Répondez par écrit ou à voix haute."],
                    [Lock, "Vous décidez", "Vos réponses restent privées tant que vous ne les partagez pas."],
                    [ShieldCheck, "Rien d'obligatoire", "Passez ou reportez une question quand vous voulez."],
                    [Mic, "Votre voix compte", "Personne n'écrit à votre place."],
                  ].map(([I, t, d]) => {
                    const Icon = I as typeof PenLine;
                    return (
                      <li key={t as string} className="flex gap-3 rounded-lg bg-creme-200 p-4">
                        <Icon className="mt-0.5 size-5 shrink-0 text-terre" aria-hidden />
                        <div>
                          <p className="font-semibold">{t as string}</p>
                          <p className="text-[15px] text-ink-muted">{d as string}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xl" onClick={accept}>
                    Accepter l'invitation
                  </Button>
                  <span className="text-sm text-ink-muted">Lien valable jusqu'au {fmtDate(p.invitation.expiresAt)}.</span>
                </div>
                <p className="text-sm text-ink-muted">Vous ne souhaitez pas participer ? Ignorez simplement ce message : rien ne sera créé sans votre accord.</p>
              </>
            )}
            {st === "programmee" && <Alert tone="info" title="Cette invitation n'est pas encore ouverte">Elle sera envoyée le {fmtDate(p.invitation.sendAt)}, à la date choisie pour le cadeau. (Démo : « +1 semaine » ou « Envoyer maintenant » côté acheteur.)</Alert>}
            {st === "expiree" && <Alert tone="warning" title="Cette invitation a expiré">Pour votre sécurité, les liens d'invitation ne durent que 30 jours. Demandez à {p.buyerName} de vous la renvoyer : un nouveau lien remplacera celui-ci.</Alert>}
            {st === "revoquee" && <Alert tone="warning" title="Cette invitation a été annulée">Ce lien ne fonctionne plus. Si c'est une erreur, contactez {p.buyerName}.</Alert>}
            {st === "acceptee" && (
              <Alert tone="success" title="Invitation déjà acceptée" action={<Button onClick={accept}>Continuer vers mon espace</Button>}>
                Vous avez accepté cette invitation le {fmtDate(p.invitation.acceptedAt!)}.
              </Alert>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (asEditor) {
    const p = asEditor;
    const e = p.editors.find((x) => x.token === tok)!;
    const accept = () => {
      const r = useDemo.getState().acceptEditorInvite(tok);
      if (r.ok) nav.push(`/editeur/livres/${p.id}`);
    };
    return (
      <div className="container-page max-w-2xl py-12">
        <div className="card p-6 sm:p-10">
          <Users className="size-9 text-terre" aria-hidden />
          <h1 className="mt-4 text-3xl">
            {p.narrator.firstName} {p.narrator.lastName} vous invite à l'aider pour son livre
          </h1>
          {e.status === "revoquee" ? (
            <Alert tone="warning" className="mt-6" title="Cet accès a été retiré">
              {p.narrator.firstName} a retiré cette invitation. Le lien ne donne plus accès à aucun contenu.
            </Alert>
          ) : (
            <>
              <ul className="mt-6 space-y-2 text-[15px]">
                <li>• Vous lirez uniquement les souvenirs que {p.narrator.firstName} partage avec vous.</li>
                <li>• Vos corrections sont des suggestions : {p.narrator.firstName} les accepte ou les refuse.</li>
                <li>• Vous ne pouvez ni valider le livre, ni voir les contenus masqués.</li>
              </ul>
              <Button size="xl" className="mt-8" onClick={accept}>
                {e.status === "active" ? "Ouvrir le livre" : "Accepter l'invitation"}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-16">
      <Alert tone="warning" title="Lien d'invitation introuvable">
        Ce lien est incomplet ou n'existe plus. Vérifiez l'e-mail reçu, ou consultez la <Link href="/demo/boite-mail">boîte e-mail de démonstration</Link>.
      </Alert>
    </div>
  );
}
