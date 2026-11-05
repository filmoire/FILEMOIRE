"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/lang";
import { tr } from "@/i18n/core";
import { isLive } from "@/lib/mode";
import { asset, Link } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { PACKAGES } from "@/lib/catalog";
import { DemoBar } from "@/components/shell/demo-bar";
import { Logo } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { Dialog } from "@/components/ui/dialog";

const ContactForm = lazy(() =>
  import("./sections").then((module) => ({ default: module.ContactForm })),
);
const offerHref = (code: string) =>
  `${isLive ? "/offrir" : "/acheteur/offrir"}?formule=${code}`;
function prepareBuyer() {
  if (!isLive && useDemo.getState().persona.role !== "acheteur")
    useDemo.getState().setPersona({ role: "acheteur" });
}

export function HomeScreen() {
  useLang((state) => state.lang);
  const [contact, setContact] = useState<{
    topic: "question" | "devis";
    message: string;
  } | null>(null);
  const contactTrigger = useRef<HTMLElement | null>(null);
  const openContact = (
    topic: "question" | "devis" = "question",
    message = "",
  ) => {
    contactTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setContact({ topic, message });
  };
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === "#contact")
        setContact({ topic: "question", message: "" });
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const closeContact = () => {
    setContact(null);
    if (window.location.hash === "#contact")
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    requestAnimationFrame(() => contactTrigger.current?.focus());
  };
  return (
    <>
      <DemoBar />
      <div className="landing">
        <a href="#contenu" className="landing-skip">
          Aller au contenu
        </a>
        <header className="wrap nav">
          <Logo className="landing-logo" />
          <nav className="nav-links" aria-label="Navigation principale">
            <a href="#parcours">Le parcours</a>
            <a href="#livre">Le livre</a>
            <a href="#offres">Les offres</a>
          </nav>
          <Link className="login" href={isLive ? "/acces" : "/connexion"}>
            Connexion
          </Link>
          <a className="button" href="#offres">
            Offrir Filémoire ↗
          </a>
        </header>
        <main id="contenu" tabIndex={-1}>
          <section className="wrap hero">
            <div className="hero-copy">
              <p className="eyebrow">La mémoire familiale, vivante</p>
              <h1>
                Gardez la façon
                <br />
                dont il raconte.
              </h1>
              <p className="intro">
                Offrez à un proche des questions qui donnent envie de raconter.
                Ses mots, sa voix et ses photos deviennent un livre qu’il valide
                lui-même.
              </p>
              <div className="actions">
                <a className="button" href="#offres">
                  Offrir Filémoire <span>↗</span>
                </a>
                <Link className="link" href="/livre-exemple">
                  Voir un livre exemple ↗
                </Link>
              </div>
              <div className="reassure">
                <span>À son rythme</span>
                <span>Texte ou voix</span>
                <span>Ses souvenirs restent privés</span>
              </div>
            </div>
            <div className="art-pair">
              <figure className="art">
                <img
                  src={asset("/landing/family-voice.webp")}
                  width={1536}
                  height={1024}
                  alt="Une voix relie les générations"
                  decoding="async"
                  fetchPriority="high"
                />
                <figcaption>
                  Des souvenirs racontés. Un livre transmis.
                </figcaption>
              </figure>
              <figure className="art">
                <img
                  src={asset("/landing/rose-book.webp")}
                  width={1024}
                  height={1536}
                  alt="Au fil de Rose, un exemple de livre Filémoire"
                  decoding="async"
                />
                <figcaption>
                  Des souvenirs racontés. Un livre transmis.
                </figcaption>
              </figure>
            </div>
          </section>
          <section className="how" id="parcours">
            <div className="wrap">
              <header>
                <p className="eyebrow">Comment ça marche</p>
                <h2>
                  Vous offrez le début.
                  <br />
                  Il raconte la suite.
                </h2>
                <p className="section-intro">
                  Un parcours guidé, de la première question au livre imprimé.
                </p>
              </header>
              <div className="steps">
                <article>
                  <span className="num">01</span>
                  <h3>Offrir & inviter</h3>
                  <p>
                    Choisissez un parcours et une date. Votre proche accepte
                    l’invitation et règle sa confidentialité.
                  </p>
                </article>
                <article>
                  <span className="num">02</span>
                  <h3>Raconter & enrichir</h3>
                  <p>
                    Une question chaque semaine. Il répond à son rythme, par
                    écrit ou à voix haute, puis ajoute ses photos.
                  </p>
                </article>
                <article>
                  <span className="num">03</span>
                  <h3>Relire & transmettre</h3>
                  <p>
                    Les souvenirs deviennent des chapitres. Il corrige, valide
                    l’aperçu, puis le livre est imprimé et livré.
                  </p>
                </article>
              </div>
            </div>
          </section>
          <section className="voice">
            <div className="wrap voice-layout">
              <header>
                <p className="eyebrow">La voix comme point de départ</p>
                <h2>
                  Il parle.
                  <br />
                  Son histoire prend forme.
                </h2>
                <p>
                  Une question simple. Le temps de chercher ses mots. Puis un
                  récit à relire, à corriger et à garder.
                </p>
              </header>
              <div className="voice-card">
                <p className="eyebrow">
                  Une question pour ouvrir les souvenirs
                </p>
                <h3>Quel endroit vous rappelle votre enfance ?</h3>
                <div className="voice-path">
                  <span>01 · Raconter</span>
                  <span>02 · Relire</span>
                  <span>03 · Transmettre</span>
                </div>
                <details>
                  <summary>Lire un exemple de récit ↗</summary>
                  <p>
                    « Je me souviens de la cuisine, de la fenêtre ouverte et de
                    l’odeur du pain. »
                  </p>
                  <small>
                    Extrait fictif, présenté pour illustrer le parcours.
                  </small>
                </details>
                <p className="fine">
                  Transcription à relire et QR audio privé avec Filémoire Voix.
                </p>
              </div>
            </div>
          </section>
          <section className="control" id="confidentialite">
            <div className="wrap control-layout">
              <header>
                <p className="eyebrow">Confidentialité et liberté</p>
                <h2>
                  Son histoire.
                  <br />
                  Ses décisions.
                </h2>
                <p>
                  Certains souvenirs se partagent, d’autres restent personnels.
                  Le narrateur décide, souvenir par souvenir, qui peut les lire.
                </p>
                <figure className="illustration-frame">
                  <img
                    src={asset("/landing/family-photos.webp")}
                    width={1400}
                    height={933}
                    alt="Des souvenirs de famille réunis en photos"
                    decoding="async"
                    loading="lazy"
                  />
                </figure>
              </header>
              <div className="rights">
                <article>
                  <span>01</span>
                  <div>
                    <h3>Raconter à son rythme</h3>
                    <p>
                      Passer une question, la reporter, corriger ou supprimer
                      une réponse.
                    </p>
                  </div>
                </article>
                <article>
                  <span>02</span>
                  <div>
                    <h3>Partager avec les bonnes personnes</h3>
                    <p>
                      Une visibilité choisie pour chaque souvenir. L’aide
                      familiale se fait uniquement sur invitation.
                    </p>
                  </div>
                </article>
                <article>
                  <span>03</span>
                  <div>
                    <h3>Valider avant l’impression</h3>
                    <p>
                      Le narrateur relit le contenu et approuve l’aperçu.
                      L’équipe n’accède aux récits qu’avec son autorisation
                      temporaire.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </section>
          <section className="book" id="livre">
            <div className="wrap book-layout">
              <figure>
                <img
                  src={asset("/landing/open-book.webp")}
                  width={1400}
                  height={933}
                  alt="Un livre Filémoire ouvert, avec des récits et des photos"
                  decoding="async"
                  loading="lazy"
                />
                <figcaption>
                  Exemple de mise en page · contenu fictif
                </figcaption>
              </figure>
              <div className="book-copy">
                <p className="eyebrow">Un livre à garder</p>
                <h2>
                  Ses mots.
                  <br />
                  Entre vos mains.
                </h2>
                <p>
                  Des chapitres, des photos et les détails d’une vie. Un livre
                  composé avec soin, relu et validé par la personne qui raconte.
                </p>
                <ul className="list">
                  <li>Des questions pour faire revenir les souvenirs</li>
                  <li>Des photos et leurs légendes</li>
                  <li>Une voix à retrouver par QR audio avec l’offre Voix</li>
                </ul>
                <a className="button" href="#offres">
                  Choisir mon parcours ↗
                </a>
              </div>
            </div>
          </section>
          <section className="offers" id="offres">
            <div className="wrap">
              <header>
                <p className="eyebrow">Un cadeau à sa mesure</p>
                <h2>
                  Choisissez le début
                  <br />
                  de son histoire.
                </h2>
                <p className="section-intro">
                  Questions guidées, compte privé, aperçu avant impression et
                  support.
                </p>
              </header>
              <div className="prices">
                <article className="price">
                  <p className="eyebrow">Filémoire Essentiel</p>
                  <h3>Le plaisir de raconter</h3>
                  <p className="amount">
                    {PACKAGES[0].priceLabel}
                    <small>TTC indicatif</small>
                  </p>
                  <ul>
                    <li>26 questions guidées</li>
                    <li>Réponses écrites et photos</li>
                    <li>Livre souple</li>
                  </ul>
                  <Link
                    className="button"
                    href={offerHref("essentiel")}
                    onClick={prepareBuyer}
                  >
                    Offrir Essentiel ↗
                  </Link>
                </article>
                <article className="price featured">
                  <p className="eyebrow">Filémoire Héritage</p>
                  <h3>Une vie à transmettre</h3>
                  <p className="amount">
                    {PACKAGES[1].priceLabel}
                    <small>TTC indicatif</small>
                  </p>
                  <ul>
                    <li>52 questions guidées</li>
                    <li>Éditeur familial</li>
                    <li>Livre relié, 1 exemplaire</li>
                  </ul>
                  <Link
                    className="button"
                    href={offerHref("heritage")}
                    onClick={prepareBuyer}
                  >
                    Offrir Héritage ↗
                  </Link>
                </article>
                <article className="price">
                  <p className="eyebrow">Filémoire Voix</p>
                  <h3>Ses mots, avec sa voix</h3>
                  <p className="amount">
                    {PACKAGES[2].priceLabel}
                    <small>TTC indicatif</small>
                  </p>
                  <ul>
                    <li>52 questions guidées</li>
                    <li>Transcription à relire</li>
                    <li>QR audio privé dans le livre</li>
                  </ul>
                  <Link
                    className="button"
                    href={offerHref("voix")}
                    onClick={prepareBuyer}
                  >
                    Offrir Voix ↗
                  </Link>
                </article>
              </div>
              <div className="premium">
                <article>
                  <h3>Filémoire Bilingue</h3>
                  <p>Deux langues, avec relecture humaine.</p>
                  <strong>299–449 €</strong>
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => openContact("devis", "Filémoire Bilingue")}
                  >
                    Demander un devis ↗
                  </button>
                </article>
                <article>
                  <h3>Filémoire Accompagné</h3>
                  <p>Interviews par un biographe, édition premium.</p>
                  <strong>690–1 490 €</strong>
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => openContact("devis", "Filémoire Accompagné")}
                  >
                    Demander un devis ↗
                  </button>
                </article>
              </div>
              <div className="extras">
                <p>
                  Exemplaire supplémentaire <b>39–69 €</b>
                </p>
                <p>
                  Coffret cadeau <b>+19–39 €</b>
                </p>
                <p>
                  Entreprise / mutuelle <b>Sur devis</b>
                </p>
              </div>
              <p className="fine">
                Prix TTC indicatifs du dossier 2026, à confirmer par les devis
                et les phases de test. Le QR audio est réservé à Filémoire Voix.
              </p>
            </div>
          </section>
          <section className="faq" id="faq">
            <div className="wrap faq-layout">
              <header>
                <p className="eyebrow">Avant de commencer</p>
                <h2>
                  Quelques questions,
                  <br />
                  en toute simplicité.
                </h2>
              </header>
              <div>
                <article>
                  <h3>Qui peut lire les souvenirs ?</h3>
                  <p>
                    Le narrateur décide de leur visibilité : lui seul, son
                    éditeur familial ou sa famille.
                  </p>
                </article>
                <article>
                  <h3>Et si une question est trop personnelle ?</h3>
                  <p>Il peut l’ignorer, la modifier ou y revenir plus tard.</p>
                </article>
                <article>
                  <h3>Faut-il tout écrire ?</h3>
                  <p>
                    Le parcours propose des réponses écrites ou vocales selon
                    l’offre. La transcription se relit et se corrige.
                  </p>
                </article>
                <article>
                  <h3>Quand le livre est-il imprimé ?</h3>
                  <p>
                    Après la relecture et la validation de l’aperçu par le
                    narrateur.
                  </p>
                </article>
              </div>
            </div>
          </section>
          <section className="closing" id="contact">
            <div className="wrap closing-layout">
              <div>
                <p className="eyebrow">
                  Un anniversaire. Une retraite. Ou simplement l’envie.
                </p>
                <h2>
                  Et si vous lui offriez
                  <br />
                  le temps de raconter ?
                </h2>
                <div className="actions">
                  <a className="button" href="#offres">
                    Offrir Filémoire <span>↗</span>
                  </a>
                  <Link className="link" href="/livre-exemple">
                    Voir un livre exemple ↗
                  </Link>
                </div>
              </div>
              <figure className="closing-frame">
                <img
                  src={asset("/landing/reading.webp")}
                  width={1400}
                  height={933}
                  alt="Une lectrice retrouve ses souvenirs dans son livre"
                  decoding="async"
                  loading="lazy"
                />
              </figure>
            </div>
          </section>
        </main>
        <footer className="wrap">
          <div className="foot-top">
            <Logo className="landing-logo" />
            <p>
              Une question à la fois,
              <br />
              une vie à transmettre.
            </p>
            <div>
              <a href="#parcours">Comment ça marche</a>
              <a href="#offres">Offres et tarifs</a>
              <Link href="/livre-exemple">Livre exemple</Link>
            </div>
            <div>
              <button
                className="text-action"
                type="button"
                onClick={() => openContact()}
              >
                Contact
              </button>
              <a href="#confidentialite">Confidentialité</a>
              <Link href={isLive ? "/acces" : "/connexion"}>Connexion</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© Filémoire 2026</span>
            <span>Illustrations et récits présentés à titre d’exemple</span>
            <LangSwitch className="landing-language" />
          </div>
          <div className="legal-links">
            <Link href="/legal">Conditions et confidentialité</Link>
            <Link href="/retractation">Se rétracter du contrat</Link>
            <a href="#faq">Questions fréquentes</a>
          </div>
        </footer>
      </div>
      <Dialog
        open={contact !== null}
        onOpenChange={(open) => {
          if (!open) closeContact();
        }}
        title={
          contact?.topic === "devis" ? "Demander un devis" : "Nous contacter"
        }
        description="Une question sur Filémoire ? Écrivez-nous."
      >
        {contact && (
          <Suspense
            fallback={
              <div className="min-h-[560px] sm:min-h-[440px]" role="status">
                Chargement du formulaire…
              </div>
            }
          >
            <ContactForm
              defaultTopic={contact.topic}
              defaultMessage={
                contact.message
                  ? tr("Je souhaite en savoir plus sur {0}.").replace(
                      "{0}",
                      contact.message,
                    )
                  : ""
              }
            />
          </Suspense>
        )}
      </Dialog>
    </>
  );
}
