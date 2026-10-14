"use client";

import { BookViewer } from "@/components/book/viewer";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Link } from "@/lib/nav";
import { sampleProject } from "@/lib/sample";

export function SampleBookScreen() {
  const p = sampleProject();
  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Livre exemple"
        title="« Au fil de Rose »"
        intro="Un livre fictif, composé comme le seront les livres Filémoire : couverture, dédicace, sommaire, chapitres, souvenirs, illustrations et QR audio."
        actions={
          <Button asChild>
            <Link href="/offres">Offrir Filémoire</Link>
          </Button>
        }
      />
      <Alert tone="info" className="mt-6">
        Rose Delmas et sa famille sont des personnages inventés. Les images sont des illustrations de démonstration. Le QR code renvoie à une page d'écoute d'exemple (son d'exemple, pas une voix).
      </Alert>
      <div className="mt-8">
        <BookViewer project={p} viewer={{ kind: "narrateur" }} />
      </div>
    </div>
  );
}
