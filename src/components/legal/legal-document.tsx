"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUp, FileText } from "lucide-react";
import { LivePublicHeader } from "@/components/live/shell";
import {
  LEGAL_LABELS as labels,
  LEGAL_CONTACT_EMAIL,
  LEGAL_PROVIDERS,
  LEGAL_SOURCES,
  OPERATOR_FIELDS,
  PRIVACY_SECTIONS,
  REFUND_SECTIONS,
  TERMS_SECTIONS,
  type LegalText,
} from "@/content/legal";
import { useLang } from "@/i18n/lang";

export function LegalDocument() {
  const lang = useLang((state) => state.lang);
  const t = (text: LegalText) => text[lang === "en" ? 1 : 0];
  const navigation = [
    ["mentions", labels.operatorTitle],
    ["confidentialite", labels.privacyTitle],
    ["conditions", labels.termsTitle],
    ["remboursements", labels.refundsTitle],
    ["contact", labels.contactTitle],
  ] as const;

  return (
    <div id="legal-top" className="container-page max-w-5xl py-8 sm:py-12">
      <LivePublicHeader />
      <main className="mt-12 space-y-10 sm:mt-16" lang={lang}>
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-ink-muted" translate="no">
            {t(labels.version)}
          </p>
          <h1 translate="no">{t(labels.title)}</h1>
          <p className="text-lg text-ink-muted" translate="no">
            {t(labels.intro)}
          </p>
        </div>

        <aside
          aria-labelledby="legal-draft-title"
          className="rounded-xl border border-or/50 bg-or-50 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <FileText
              className="mt-1 size-5 shrink-0 text-or-700"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <h2
                id="legal-draft-title"
                className="font-sans text-base font-semibold"
                translate="no"
              >
                {t(labels.draftTitle)}
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed" translate="no">
                {t(labels.draftBody)}
              </p>
            </div>
          </div>
        </aside>

        <nav
          aria-label={t(labels.navigation)}
          translate="no"
          className="border-y border-line py-4"
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {navigation.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-prune"
                  translate="no"
                >
                  {t(label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section
          id="mentions"
          aria-labelledby="mentions-title"
          className="scroll-mt-6 space-y-6"
        >
          <h2 id="mentions-title" translate="no">
            {t(labels.operatorTitle)}
          </h2>
          <p className="max-w-3xl" translate="no">
            {t(labels.operatorIntro)}
          </p>
          <dl className="divide-y divide-line rounded-xl border border-line bg-white px-5 sm:px-6">
            {OPERATOR_FIELDS.map((field) => (
              <div
                key={field.label[0]}
                className="grid gap-2 py-4 sm:grid-cols-[1.3fr_1fr] sm:gap-8"
              >
                <dt className="text-sm font-medium" translate="no">
                  {t(field.label)}
                </dt>
                <dd className="text-sm text-ink-muted" translate="no">
                  {t(field.value)}
                </dd>
              </div>
            ))}
          </dl>
          <h3 translate="no">{t(labels.hostingTitle)}</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            {LEGAL_PROVIDERS.map(({ name, purpose }) => (
              <div
                key={name}
                className="rounded-xl border border-line bg-white p-5"
              >
                <dt className="font-medium text-prune" translate="no">
                  {name}
                </dt>
                <dd className="mt-2 text-sm text-ink-muted" translate="no">
                  {t(purpose)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="max-w-3xl text-sm text-ink-muted" translate="no">
            {t(labels.hostingNote)}
          </p>
        </section>

        <section
          id="confidentialite"
          aria-labelledby="privacy-title"
          className="scroll-mt-6 space-y-8 border-t border-line pt-10"
        >
          <h2 id="privacy-title" translate="no">
            {t(labels.privacyTitle)}
          </h2>
          {PRIVACY_SECTIONS.map((section) => (
            <div key={section.id} className="max-w-3xl space-y-3">
              <h3 translate="no">{t(section.title)}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} translate="no">
                  {t(paragraph)}
                </p>
              ))}
            </div>
          ))}
        </section>

        <section
          id="conditions"
          aria-labelledby="terms-title"
          className="scroll-mt-6 space-y-8 border-t border-line pt-10"
        >
          <div className="max-w-3xl space-y-3">
            <h2 id="terms-title" translate="no">
              {t(labels.termsTitle)}
            </h2>
            <p className="text-ink-muted" translate="no">
              {t(labels.termsIntro)}
            </p>
          </div>
          {TERMS_SECTIONS.map((section) => (
            <div key={section.id} className="max-w-3xl space-y-3">
              <h3 translate="no">{t(section.title)}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} translate="no">
                  {t(paragraph)}
                </p>
              ))}
            </div>
          ))}
        </section>

        <section
          id="remboursements"
          aria-labelledby="refunds-title"
          className="scroll-mt-6 space-y-8 border-t border-line pt-10"
        >
          <div className="max-w-3xl space-y-3">
            <h2 id="refunds-title" translate="no">
              {t(labels.refundsTitle)}
            </h2>
            <p className="text-ink-muted" translate="no">
              {t(labels.refundsIntro)}
            </p>
          </div>
          {REFUND_SECTIONS.map((section) => (
            <div key={section.id} className="max-w-3xl space-y-3">
              <h3 translate="no">{t(section.title)}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index} translate="no">
                  {t(paragraph)}
                </p>
              ))}
            </div>
          ))}
        </section>

        <section
          id="contact"
          aria-labelledby="contact-title"
          className="scroll-mt-6 space-y-5 rounded-xl border border-line bg-white p-5 sm:p-8"
        >
          <h2 id="contact-title" translate="no">
            {t(labels.contactTitle)}
          </h2>
          <p className="max-w-3xl" translate="no">
            {t(labels.contactBody)}
          </p>
          <p>
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="underline"
              translate="no"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
          <Link
            href="/#contact"
            className="inline-flex min-h-11 items-center rounded-full bg-prune px-6 py-3 text-sm font-medium text-white hover:bg-prune-700"
            translate="no"
          >
            {t(labels.contactLink)}
          </Link>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                className="underline"
                href="https://www.cnil.fr/fr/mes-demarches/les-droits-pour-maitriser-vos-donnees-personnelles"
                translate="no"
              >
                {t(labels.rightsLink)}
              </a>
            </li>
            <li>
              <a
                className="underline"
                href="https://www.cnil.fr/fr/adresser-une-plainte"
                translate="no"
              >
                {t(labels.complaintLink)}
              </a>
            </li>
          </ul>
        </section>

        <aside
          className="space-y-4 text-sm text-ink-muted"
          aria-labelledby="legal-sources"
        >
          <h2
            id="legal-sources"
            className="font-sans text-base font-semibold"
            translate="no"
          >
            {t(labels.sourcesTitle)}
          </h2>
          <ul className="space-y-3">
            {LEGAL_SOURCES.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className="underline" translate="no">
                  {t(label)}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-sm">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2"
          translate="no"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t(labels.back)}
        </Link>
        <a
          href="#legal-top"
          className="inline-flex min-h-11 items-center gap-2"
          translate="no"
        >
          {t(labels.top)}
          <ArrowUp className="size-4" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
