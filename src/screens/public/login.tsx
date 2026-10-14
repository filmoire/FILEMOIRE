"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { Hydrated } from "@/components/shell/providers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useNav } from "@/lib/nav";
import { FAMILY } from "@/lib/seed";
import { homeOf } from "@/lib/session";
import { useDemo } from "@/lib/store";
import type { Persona } from "@/lib/types";

const schema = z.object({ email: z.string().trim().email("Cette adresse e-mail ne semble pas valide (exemple : prenom@domaine.fr).") });

export function LoginScreen() {
  const nav = useNav();
  const projects = useDemo((s) => s.projects);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const e = formState.errors.email;
  const become = (p: Persona) => {
    useDemo.getState().setPersona(p);
    nav.push(homeOf(p));
  };
  const submit = handleSubmit(({ email }) => {
    const known = [FAMILY.buyer.email, FAMILY.editor.email, ...projects.map((p) => p.narrator.email)].includes(email.toLowerCase());
    if (known) {
      const s = useDemo.getState();
      useDemo.setState({ emails: [{ id: `e_${Date.now()}`, to: email.toLowerCase(), subject: "Votre lien de connexion Filémoire", lines: ["Ce lien est valable 15 minutes et ne fonctionne qu'une fois (simulation).", "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."], cta: { label: "Me connecter", href: "/connexion" }, at: s.now() }, ...s.emails] });
    }
    // Même message dans tous les cas : on ne révèle pas si un compte existe.
    toast.success("Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé.", { description: "Démonstration : consultez le menu « E-mails »." });
  });
  const narrators = projects.filter((p) => p.invitation.status === "acceptee");
  return (
    <div className="container-page grid max-w-5xl gap-8 py-12 lg:grid-cols-2">
      <div className="card p-6 sm:p-8">
        <h1 className="text-3xl">Connexion</h1>
        <p className="mt-2 text-ink-muted">Pas de mot de passe à retenir : nous vous envoyons un lien de connexion par e-mail.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <Field id="login-email" label="Adresse e-mail" error={e?.message}>
            <Input id="login-email" type="email" autoComplete="email" aria-invalid={!!e} aria-describedby={describedBy("login-email", false, e)} {...register("email")} />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            Recevoir mon lien de connexion
          </Button>
        </form>
        <p className="mt-4 text-sm text-ink-muted">
          Vous avez reçu une invitation ? Ouvrez simplement le lien de l'e-mail. Pas encore de compte ? <Link href="/offres">Offrir Filémoire</Link>.
        </p>
      </div>
      <div className="card p-6 sm:p-8">
        <h2 className="text-2xl">Comptes de démonstration</h2>
        <p className="mt-2 text-ink-muted">Pour la démonstration, entrez directement dans un rôle. Données fictives.</p>
        <Hydrated>
          <div className="mt-5 grid gap-2">
            <Button variant="outline" size="lg" className="justify-start" onClick={() => become({ role: "acheteur" })}>
              Sophie Martin — acheteuse
            </Button>
            {narrators.map((p) => (
              <Button key={p.id} variant="outline" size="lg" className="justify-start" onClick={() => become({ role: "narrateur", projectId: p.id })}>
                {p.narrator.firstName} {p.narrator.lastName} — narrateur·rice
              </Button>
            ))}
            {narrators.length === 0 && <Alert tone="info">Aucun narrateur pour l'instant : il apparaîtra après l'acceptation d'une invitation.</Alert>}
            <Button variant="outline" size="lg" className="justify-start" onClick={() => become({ role: "editeur" })}>
              Thomas Martin — éditeur familial
            </Button>
            <Button variant="outline" size="lg" className="justify-start" onClick={() => become({ role: "ops" })}>
              Équipe Filémoire — Opérations
            </Button>
          </div>
        </Hydrated>
      </div>
    </div>
  );
}
