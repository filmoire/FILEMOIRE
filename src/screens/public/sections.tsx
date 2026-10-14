"use client";
import { isLive } from "@/lib/mode";
import { api } from "@/components/live/client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Camera,
  Check,
  Feather,
  Gift,
  Headphones,
  Layers,
  Lock,
  Mail,
  Mic,
  PenLine,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { describedBy, Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PACKAGES } from "@/lib/catalog";
import { Link, useNav } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/utils";

export const STEPS = [
  {
    t: "Offrir",
    d: "Choisir un parcours, un destinataire et une date.",
    I: Gift,
  },
  {
    t: "Inviter",
    d: "Le narrateur accepte et configure la confidentialité.",
    I: Send,
  },
  {
    t: "Raconter",
    d: "Une question arrive chaque semaine avec relance douce.",
    I: PenLine,
  },
  {
    t: "Enrichir",
    d: "Photos, légendes, dates et personnes sont ajoutées.",
    I: Camera,
  },
  {
    t: "Structurer",
    d: "Réponses en chapitres, chronologie et extraits audio.",
    I: Layers,
  },
  {
    t: "Relire",
    d: "Le narrateur et l'éditeur familial corrigent et masquent.",
    I: Feather,
  },
  {
    t: "Prévisualiser",
    d: "Mise en page, couverture, QR et ordre validés.",
    I: BookOpen,
  },
  {
    t: "Imprimer",
    d: "Livre fabriqué, contrôlé, livré et archivé.",
    I: Printer,
  },
];

export function Timeline({ compact }: { compact?: boolean }) {
  return (
    <ol
      className={cn(
        "grid gap-4",
        compact
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {STEPS.map((s, i) => (
        <li
          key={s.t}
          className="relative rounded-lg border border-line bg-white p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-prune-50 font-serif text-lg font-semibold text-prune">
              {i + 1}
            </span>
            <s.I className="size-5 text-terre" aria-hidden />
          </div>
          <h3 className="mt-3 text-xl">{s.t}</h3>
          <p className="mt-1 text-[15px] text-ink-muted">{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

export const ROLES = [
  { t: "Acheteur", d: "Payer, inviter et suivre sans lire le privé.", I: Gift },
  { t: "Narrateur", d: "Répondre, modifier, partager et valider.", I: Mic },
  { t: "Éditeur familial", d: "Aider uniquement sur invitation.", I: Users },
  {
    t: "Filémoire",
    d: "Traiter et produire sans droit public automatique.",
    I: ShieldCheck,
  },
];

export function RolesRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ROLES.map((r) => (
        <div
          key={r.t}
          className="flex gap-3 rounded-lg bg-prune p-4 text-creme"
        >
          <r.I className="mt-0.5 size-5 shrink-0 text-or" aria-hidden />
          <div>
            <p className="font-serif text-lg font-semibold">{r.t}</p>
            <p className="text-sm text-creme/85">{r.d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const BENEFITS = [
  {
    t: "Des questions guidées chaque semaine",
    d: "Simples et concrètes, elles ouvrent des souvenirs sans forcer les confidences.",
    I: Sparkles,
  },
  {
    t: "Écrire ou raconter à voix haute",
    d: "Le narrateur répond comme il préfère ; la transcription se relit et se corrige.",
    I: Headphones,
  },
  {
    t: "Les photos de famille",
    d: "Légendes, dates et personnes, rattachées au bon souvenir.",
    I: Camera,
  },
  {
    t: "Des chapitres soigneusement organisés",
    d: "Origines, enfance, travail, traditions… dans l'ordre que vous choisissez.",
    I: Layers,
  },
  {
    t: "Le narrateur garde le contrôle",
    d: "Il peut passer une question, masquer un passage, choisir qui lit, et valide le livre.",
    I: Lock,
  },
  {
    t: "Un beau livre imprimé",
    d: "Relié, mis en page avec soin, avec QR audio pour entendre encore sa voix (offre Voix).",
    I: BookOpen,
  },
];

export function Benefits() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {BENEFITS.map((b) => (
        <div
          key={b.t}
          className="rounded-lg border border-line bg-white p-6 shadow-soft"
        >
          <b.I className="size-7 text-terre" aria-hidden />
          <h3 className="mt-4 text-xl">{b.t}</h3>
          <p className="mt-2 text-[15px] text-ink-muted">{b.d}</p>
        </div>
      ))}
    </div>
  );
}

export function Pricing({ onPick }: { onPick?: (code: string) => void }) {
  const nav = useNav();
  const pick = (code: string) => {
    if (isLive) {
      window.location.assign(`/offrir?formule=${code}`);
      return;
    }
    if (onPick) return onPick(code);
    if (useDemo.getState().persona.role !== "acheteur")
      useDemo.getState().setPersona({ role: "acheteur" });
    nav.push(`/acheteur/offrir?formule=${code}`);
  };
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-3">
        {PACKAGES.filter((p) => !p.quoteOnly).map((p) => (
          <div
            key={p.code}
            className={cn(
              "relative flex flex-col rounded-xl border bg-white p-6 shadow-soft",
              p.highlight ? "border-prune ring-1 ring-prune" : "border-line",
            )}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-terre px-3 py-1 text-xs font-semibold text-white">
                Le plus offert
              </span>
            )}
            <h3 className="text-2xl">{p.name}</h3>
            <p className="mt-1 text-[15px] text-ink-muted">{p.short}</p>
            <p className="mt-4 font-serif text-4xl font-semibold text-prune">
              {p.priceLabel}{" "}
              <span className="align-middle font-sans text-xs font-medium text-ink-muted">
                TTC indicatif
              </span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check
                    className="mt-1 size-4 shrink-0 text-success"
                    aria-hidden
                  />{" "}
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6"
              variant={p.highlight ? "primary" : "secondary"}
              onClick={() => pick(p.code)}
            >
              Offrir {p.name.replace("Filémoire ", "")}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {PACKAGES.filter((p) => p.quoteOnly).map((p) => (
          <div
            key={p.code}
            className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6 shadow-soft sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <h3 className="text-xl">{p.name}</h3>
              <p className="text-[15px] text-ink-muted">{p.short}</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-prune">
                {p.priceLabel}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/offres?devis=${p.code}#devis`}>
                Demander un devis
              </Link>
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 rounded-xl border border-dashed border-or bg-or-50/50 p-5 text-[15px] sm:grid-cols-3">
        <p>
          <strong className="text-prune">Exemplaire supplémentaire</strong>
          <br />
          Livre identique pour enfants et petits-enfants · 39 – 69 €
        </p>
        <p>
          <strong className="text-prune">Coffret cadeau</strong>
          <br />
          Carte, message, emballage et date choisie · + 19 – 39 €
        </p>
        <p>
          <strong className="text-prune">Entreprise / mutuelle</strong>
          <br />
          Cadeaux de retraite ou programmes intergénérationnels · sur devis
        </p>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        {isLive
          ? "Prix TTC indicatifs. Les commandes et l’impression seront ouverts après confirmation des conditions de vente et de fabrication. Les manuscrits personnels ne comprennent aucun exemplaire imprimé."
          : "* Prix TTC indicatifs du dossier 2026, à confirmer (bêta, prévente et devis imprimeur). Hypothèse du prototype : l'enregistrement vocal est proposé dès Héritage ; le QR audio est réservé à Filémoire Voix."}
      </p>
    </div>
  );
}

export const FAQ = [
  [
    "Qui peut lire les réponses ?",
    "Le narrateur, d'abord. Il choisit pour chaque souvenir : lui seul, son éditeur familial, ou toute la famille. La personne qui offre suit la progression sans lire le contenu, sauf si le narrateur le partage.",
  ],
  [
    "Et si une question est trop personnelle ?",
    "Elle peut être passée ou reportée, sans justification. Une question passée n'est jamais comptée comme répondue.",
  ],
  [
    "Faut-il être à l'aise avec l'informatique ?",
    "Non. Une question à la fois, de grands boutons, et la possibilité de répondre à voix haute. Un proche peut aider, uniquement sur invitation.",
  ],
  [
    "La transcription est-elle automatique ?",
    "En production, une transcription assistée sera proposée puis relue. Dans ce prototype, elle est simulée et clairement signalée : rien n'est écrit à la place du narrateur.",
  ],
  [
    "Combien de temps faut-il ?",
    "Le parcours dure de 6 à 12 mois selon le rythme choisi (26 ou 52 questions). Le narrateur peut accélérer ou faire une pause.",
  ],
  [
    "Quand le livre est-il imprimé ?",
    "Uniquement après la validation explicite du narrateur. Pour Noël, des dates limites d'impression seront affichées.",
  ],
] as const;

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {FAQ.map(([q, a]) => (
        <details
          key={q}
          className="group p-5 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-xl font-semibold text-prune">
            {q}
            <span
              aria-hidden
              className="text-2xl text-terre transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-ink-muted">
            {isLive && q === "La transcription est-elle automatique ?"
              ? "Vos enregistrements sont conservés dans votre espace privé. Lorsque la transcription automatique est disponible, son texte reste à relire et à valider. Sinon, vous pouvez saisir vous-même le texte en écoutant l’audio."
              : isLive && q === "Quand le livre est-il imprimé ?"
                ? "Vous pouvez télécharger votre manuscrit en PDF. L’impression nécessite une commande payée, votre validation du livre et l’ouverture du service de fabrication."
                : a}
          </p>
        </details>
      ))}
    </div>
  );
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom."),
  email: z
    .string()
    .trim()
    .email(
      "Cette adresse e-mail ne semble pas valide (exemple : prenom@domaine.fr).",
    ),
  topic: z.enum(["question", "devis"]),
  message: z
    .string()
    .trim()
    .min(10, "Votre message est un peu court (10 caractères minimum)."),
});

export function ContactForm({
  defaultTopic = "question",
  defaultMessage = "",
}: {
  defaultTopic?: "question" | "devis";
  defaultMessage?: string;
}) {
  const { register, handleSubmit, reset, formState } = useForm<
    z.infer<typeof contactSchema>
  >({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      topic: defaultTopic,
      message: defaultMessage,
    },
  });
  const e = formState.errors;
  const submit = handleSubmit(async (v) => {
    if (isLive) {
      try {
        await api("contact", v);
        toast.success("Votre demande est enregistrée.");
        reset();
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    useDemo.getState().addSupport({
      from: v.email,
      subject:
        v.topic === "devis"
          ? `Demande de devis — ${v.name}`
          : `Question de ${v.name}`,
      body: v.message,
      kind: v.topic,
    });
    toast.success("Message envoyé (simulation)", {
      description:
        "Il apparaît dans l'espace Support des Opérations. Aucun e-mail réel n'est envoyé.",
    });
    reset();
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id="c-name" label="Votre nom" error={e.name?.message}>
        <Input
          id="c-name"
          autoComplete="name"
          aria-invalid={!!e.name}
          aria-describedby={describedBy("c-name", false, e.name)}
          {...register("name")}
        />
      </Field>
      <Field id="c-email" label="Votre e-mail" error={e.email?.message}>
        <Input
          id="c-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!e.email}
          aria-describedby={describedBy("c-email", false, e.email)}
          {...register("email")}
        />
      </Field>
      <Field id="c-topic" label="Sujet" className="sm:col-span-2">
        <Select id="c-topic" {...register("topic")}>
          <option value="question">Une question</option>
          <option value="devis">
            Un devis (Bilingue, Accompagné, entreprise)
          </option>
        </Select>
      </Field>
      <Field
        id="c-msg"
        label="Message"
        error={e.message?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="c-msg"
          aria-invalid={!!e.message}
          aria-describedby={describedBy("c-msg", false, e.message)}
          {...register("message")}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg">
          <Mail /> Envoyer
        </Button>
        <p className="mt-2 text-sm text-ink-muted">
          {isLive
            ? "N’incluez pas de souvenirs privés dans ce formulaire. Consultez notre politique de confidentialité."
            : "Démonstration : ne saisissez pas de données réelles."}
        </p>
      </div>
    </form>
  );
}
