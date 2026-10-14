# Check-list des fonctionnalités

Légende : ✅ réalisé et fonctionnel · 🧪 simulé (signalé à l'écran) · ⏳ futur (hors prototype).
« E2E » renvoie au test Playwright qui vérifie le point (voir [TESTS.md](TESTS.md)).

## Critères de réussite (brief §21) — tous vérifiés par `e2e/demo.spec.ts`

| # | Étape | Statut |
|---|---|---|
| 1 | Ouvrir la page d'accueil | ✅ |
| 2 | Explorer les offres et le livre exemple | ✅ |
| 3 | Acheter un cadeau pour un parent | ✅ 🧪 paiement simulé (accepté / refusé) |
| 4 | Envoyer l'invitation | ✅ 🧪 e-mail simulé, immédiate ou programmée |
| 5 | Passer au rôle narrateur | ✅ |
| 6 | Accepter l'invitation | ✅ |
| 7 | Régler la confidentialité | ✅ |
| 8 | Répondre à une question | ✅ |
| 9 | Enregistrer un souvenir vocal | ✅ MediaRecorder réel · 🧪 transcription |
| 10 | Ajouter une photo de famille | ✅ |
| 11 | Voir la progression | ✅ |
| 12 | Ouvrir l'éditeur de livre | ✅ |
| 13 | Inviter un éditeur familial | ✅ |
| 14 | Proposer puis accepter une correction | ✅ |
| 15 | Masquer un souvenir privé | ✅ |
| 16 | Prévisualiser le livre | ✅ |
| 17 | Valider le livre | ✅ |
| 18 | Commander l'impression | ✅ 🧪 aucun imprimeur réel |
| 19 | Suivre la commande | ✅ 🧪 transporteur fictif |

## Livrables (brief §19)

| Livrable | Statut |
|---|---|
| Prototype Next.js fonctionnel | ✅ |
| Site marketing responsive (accueil, comment ça marche, offres, livre exemple, FAQ, confidentialité, contact) | ✅ |
| Quatre expériences par rôle + sélecteur de rôle | ✅ |
| Navigation complète (35 routes) | ✅ E2E « toutes les routes » |
| Commande de cadeau interactive (7 étapes, validation, récapitulatif) | ✅ |
| Acceptation d'invitation (valide, programmée, expirée, annulée, déjà acceptée) | ✅ E2E |
| Parcours de questions guidé (26 / 52, 7 thèmes, cadence, passer, reporter, reprendre) | ✅ |
| Éditeur de réponse écrite (brouillon automatique, historique des versions) | ✅ |
| Enregistrement audio (démarrer, pause/reprise, arrêter, réécouter, recommencer, supprimer, importer) | ✅ E2E micro accepté et refusé |
| Gestion des photos (import validé, légende, date, personnes, rattachement, ordre, retrait, qualité) | ✅ |
| Éditeur de livre (chapitres, ordre, titres, contenus, masquage, états, suggestions) | ✅ |
| Aperçu du livre (couverture, titre, dédicace, sommaire, chapitres, photos, numéros de page, dernière page) | ✅ |
| Personnalisation de couverture (3 modèles) | ✅ |
| QR audio (vrai QR code vers une page d'écoute avec code famille, désactivable) | ✅ (formule Voix) |
| PDF | 🧪 aperçu illustratif via l'impression du navigateur, clairement distingué d'un PDF imprimeur |
| Démonstration de la confidentialité et des consentements | ✅ E2E |
| Flux d'impression simulé (préflight, impression, expédition, livraison, incident) | 🧪 |
| Données de démonstration cohérentes (famille Martin + autres familles côté Opérations) | ✅ |
| README avec installation | ✅ |
| Check-list (ce document), limites, recommandations de production | ✅ |
| **En plus** : version HTML autonome (un seul fichier) générée depuis le même code | ✅ E2E |
| **En plus** : interface bilingue FR / EN (bouton dans l'en-tête, dates et montants localisés, données de démo en anglais) | ✅ E2E (parcours complet en anglais, aucune chaîne non traduite) |

## Écrans par rôle

**Acheteur** — tableau de bord · mes cadeaux (statut et actions d'invitation) · tunnel d'achat (formule, parcours, destinataire, message, date et options, récapitulatif, paiement simulé, confirmation) · commandes (paiements de test, exemplaires supplémentaires) · suivi (progression sans contenu, frise du livre, souvenirs partagés, passage à Voix).

**Narrateur** — invitation · bienvenue · confidentialité et consentements · accueil (« Bonjour Madeleine, votre histoire continue. ») · question de la semaine · réponse écrite · enregistreur · réécoute · relecture de la transcription · photos · mes souvenirs · questions · progression · chapitres · éditeur de livre · aperçu · famille (éditeur, partage, code QR) · confidentialité (préférences, qui voit quoi, accès temporaire du support, demande de suppression).

**Éditeur familial** — invitation · livres confiés · souvenirs partagés · organisation des chapitres (propositions) · corrections suggérées · légendes de photos · aperçu limité · fin de relecture · suivi de ses propositions.

**Opérations** — vue d'ensemble · commandes · projets (lecture refusée sans autorisation) · bibliothèque de questions (modifier, activer, ajouter, statut éditorial) · file d'impression (préflight obligatoire, statuts, incidents) · expédition simulée · support (devis, suppressions, questions).

## Règles de confidentialité appliquées (côté navigateur)

- ✅ L'acheteur ne lit aucun souvenir par défaut ; seulement ceux partagés « avec la famille ».
- ✅ L'éditeur lit uniquement ce qui lui est partagé ; jamais les brouillons ni le contenu masqué.
- ✅ Les photos suivent la visibilité du souvenir auquel elles sont rattachées.
- ✅ Révocation immédiate de l'éditeur ; ses suggestions en attente sont écartées.
- ✅ Les contenus masqués sont exclus de tous les aperçus et du livre.
- ✅ Les Opérations voient les métadonnées ; la lecture exige une autorisation temporaire du narrateur.
- ✅ Le livre n'est imprimé qu'après la validation explicite du narrateur ; il est alors verrouillé.
- ✅ Aucune donnée de carte bancaire n'est demandée.
