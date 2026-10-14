# Filémoire — plan de prototype et inventaire des écrans

Source : `06_Filemoire_Dossier_Deployement_2026.pptx` (15 diapositives, version marque du 2 août 2026).
Légende utilisée dans tout le document :

- **[D]** exigence **documentée** dans le dossier (numéro de diapositive entre parenthèses) ;
- **[P]** **proposition** du prototype, nécessaire pour un parcours cohérent (à valider) ;
- **[F]** fonction **future**, hors prototype.

## 1. Vue produit

- Promesse [D 4-5] : « Une question à la fois, une vie à transmettre. » — « Offrez des questions aujourd'hui. Recevez une histoire de famille pour toujours. »
- Manifeste [D 2] : « Nous ne parlons jamais à la place du narrateur. » → aucune génération de texte, transcription simulée toujours étiquetée.
- Parcours en 8 étapes [D 8] : Offrir → Inviter → Raconter → Enrichir → Structurer → Relire → Prévisualiser → Imprimer.
- Contrôle du narrateur [D 7] : il peut ignorer une question, masquer un passage, corriger, choisir les destinataires et supprimer une réponse.

## 2. Rôles

| Rôle | Règle du dossier [D 8] | Ce que le prototype applique |
|---|---|---|
| Acheteur (Sophie Martin) | Payer, inviter et suivre **sans lire le privé** | Voit la progression (chiffres, statuts). Ne lit que les souvenirs que la narratrice partage explicitement « avec la famille ». |
| Narrateur (Madeleine Martin) | Répondre, modifier, partager et valider | Seul·e à valider le livre ; décide de la visibilité de chaque souvenir ; peut révoquer, masquer, supprimer. |
| Éditeur familial (Thomas Martin) | Aider **uniquement sur invitation** | Lit uniquement le contenu partagé avec lui ; toutes ses modifications sont des **suggestions** que la narratrice accepte ou refuse [P]. |
| Filémoire (Opérations) | Traiter et produire **sans droit public automatique** | Voit les métadonnées ; lecture d'un manuscrit seulement avec une autorisation temporaire accordée par le narrateur [P]. |

## 3. Inventaire des écrans et routes

Public : `/` · `/comment-ca-marche` · `/offres` · `/livre-exemple` · `/connexion` · `/invitation/[token]` · `/ecouter/[token]` (QR audio) [P] · `/demo/boite-mail` (e-mails simulés) [P]

Acheteur : `/acheteur` (tableau de bord) · `/acheteur/cadeaux` (mes cadeaux, statut d'invitation) · `/acheteur/offrir` (tunnel en 7 étapes) · `/acheteur/commandes` (commandes, confirmation, exemplaires supplémentaires) · `/acheteur/suivi` (progression du projet)

Narrateur : `/narrateur/bienvenue` (accueil + confidentialité) [P] · `/narrateur` · `/narrateur/questions` · `/narrateur/questions/[id]` (texte, voix, transcription, photos) · `/narrateur/souvenirs` · `/narrateur/photos` · `/narrateur/chapitres` · `/narrateur/livre` (éditeur de livre) · `/narrateur/apercu` (aperçu, couverture, validation, impression) · `/narrateur/famille` (éditeur familial, partages) [P] · `/narrateur/confidentialite`

Éditeur familial : `/editeur` · `/editeur/livres` · `/editeur/livres/[id]` (souvenirs partagés, chapitres, photos, suggestions) · `/editeur/relecture` (statut des suggestions)

Opérations : `/admin` · `/admin/commandes` · `/admin/projets` [P] · `/admin/questions` · `/admin/impression` (file, préflight, expédition) · `/admin/support`

## 4. Exigences fonctionnelles et statut

| Brique [D 10] | Prototype | Statut |
|---|---|---|
| Commande cadeau : pack, message, date, paiement | Tunnel 7 étapes, validation en ligne, récapitulatif, paiement **simulé** (accepté / refusé) | [D] + simulation |
| Invitations : narrateur, éditeur, contributeurs | Lien de démo, invitation programmée à la date choisie, expirée, révoquée ; invitation éditeur | [D] ; contributeurs [F] |
| Moteur de questions : calendrier, parcours, skip, relances | 26 / 52 questions, 7 parcours thématiques, une question par semaine, passer / reporter, relance douce dans le centre de notifications, horloge de démo « avancer d'une semaine » | [D] + [P] horloge |
| Réponse texte / audio : enregistrement, upload, transcription, correction | Éditeur texte avec brouillon automatique ; MediaRecorder (pause, reprise, réécoute, suppression) ; import de fichier ; **transcription simulée** à relire et valider | [D] ; transcription réelle [F] |
| Photos : import, légende, ordre, qualité | Import validé (type, taille, définition), légende, date, personnes, ordre, rattachement, avertissement qualité d'impression | [D] |
| Éditeur de livre : chapitres, titres, ordre, masquage, aperçu | 3 colonnes (chapitres / contenu / propriétés), états brouillon / partagé / masqué / en relecture / approuvé | [D] |
| QR audio : lien privé, durée, contrôle d'accès | QR réel vers `/ecouter/[token]`, code famille requis, désactivable | [D] ; durabilité serveur [F] |
| Moteur print : PDF, préflight, commande, suivi | Aperçu paginé, export PDF **illustratif** (impression navigateur), préflight **simulé**, suivi | [D] + simulation |
| Consentements : rôles, partage, marketing, suppression | Écran de consentement à l'accueil, réglages, demande de suppression | [D] |

MVP fermé vs plus tard [D 10] : arbre généalogique, marketplace de biographes, vidéo longue, archives publiques, application native et **IA écrivant à la place du narrateur** restent hors prototype.

## 5. Hypothèses (non documentées dans le dossier)

1. **Voix dans Héritage.** Le dossier associe la transcription et le QR audio à Filémoire Voix. Le scénario de démo demande pourtant que Madeleine (Héritage) enregistre un souvenir. Le prototype propose donc l'enregistrement vocal en Héritage et en Voix (transcription simulée à relire), et réserve le **QR audio** à Voix. Sophie peut passer à Voix depuis son suivi (+70 €, simulé). Essentiel reste écrit + photos.
2. **Bilingue et Accompagné** ont des prix en fourchette : ils passent par une demande de devis (cas de support simulé), pas par le paiement.
3. **Exemplaire supplémentaire** affiché à 49 € (fourchette 39-69 €) ; **coffret cadeau** à 29 € (fourchette 19-39 €). Prix indicatifs.
4. **Cadence** : une question par semaine par défaut (« une question arrive chaque semaine » [D 8]), réglable par le narrateur.
5. **Visibilité par souvenir** : « Moi seul·e » (défaut), « Moi et mon éditeur familial », « Ma famille (acheteur et éditeur) ».
6. **Validation des modifications de l'éditeur** : toutes sous forme de suggestions (texte, titre de chapitre, ordre des chapitres, légende de photo).
7. **Questions** : 52 questions de démonstration réparties sur les 10 chapitres du dossier, dont les 10 exemples officiels ; elles restent « à valider par la direction éditoriale » (checklist [D 15] : « Figer 52 questions »).

## 6. Parcours de démonstration

Deux scénarios, choisis dans la barre de démo :

- **Parcours complet** (par défaut) : rien n'est encore acheté. Il suit les 19 étapes de validation : achat par Sophie → invitation → Madeleine accepte → confidentialité → réponse écrite → voix → photo → progression → éditeur de livre → invitation de Thomas → suggestion acceptée → souvenir masqué → aperçu → validation → impression simulée → suivi.
- **Projet avancé** : le projet de Madeleine compte 8 semaines de contenu (réponses terminées, brouillon, question passée, souvenir audio, photos, plusieurs chapitres, suggestions de Thomas, souvenir masqué). Il sert à montrer un livre déjà riche.

Dans les deux cas, l'espace Opérations contient d'autres commandes fictives (métadonnées seules) à différents stades d'impression.

## 7. Priorités de réalisation

Narrateur → parcours cadeau → capture des souvenirs → création du livre → confidentialité → impression.
