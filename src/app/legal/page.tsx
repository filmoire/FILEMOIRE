import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Confidentialité et conditions",
  description:
    "Projet de mentions légales, politique de confidentialité et conditions d’utilisation de Filémoire.",
  robots: { index: false, follow: false },
};

export default function LegalPage() {
  return <LegalDocument />;
}
