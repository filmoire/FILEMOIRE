"use client";
import { useLang } from "@/i18n/lang";
import { LivePublicHeader } from "@/components/live/shell";
export default function LegalPage() {
  useLang((s) => s.lang);
  return (
    <main className="container-page max-w-3xl space-y-6 py-14">
      <LivePublicHeader />
      <h1>Confidentialité et conditions</h1>
      <p>
        Les documents contractuels de lancement sont en cours de validation. Les
        commandes restent fermées tant que les informations de l’éditeur, les
        conditions de vente et la politique de confidentialité ne sont pas
        approuvées.
      </p>
      <h2>Contrôle de vos souvenirs</h2>
      <p>
        Les réponses sont privées par défaut. Le narrateur choisit les proches
        autorisés à les lire, peut retirer un accès, exporte son récit et valide
        la version du livre avant impression.
      </p>
      <h2>Enregistrements et transcription</h2>
      <p>
        Les enregistrements servent à conserver la voix et à proposer une
        transcription que le narrateur relit. Le fournisseur, les lieux de
        traitement et les durées de conservation doivent figurer dans la
        politique approuvée avant l’accueil de clients.
      </p>
      <h2>Suppression et conservation</h2>
      <p>
        Une demande de suppression peut être annulée pendant le délai affiché
        dans l’espace. Les exemplaires physiques et les copies déjà téléchargées
        ne peuvent pas être rappelés. Le traitement des sauvegardes et la
        conservation des justificatifs de commande doivent être précisés dans
        les documents de lancement.
      </p>
    </main>
  );
}
