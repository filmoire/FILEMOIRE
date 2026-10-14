# Recommandations pour la version de production

Note du 13 octobre 2026 : le backend NestJS mentionné historiquement n’est pas présent dans ce dossier. Une nouvelle base serveur Next.js/PostgreSQL et un worker sont maintenant implémentés ici. Voir [l’état de réalisation](production/STATUS.md) et [le guide d’exploitation](production/RUNBOOK.md). Les recommandations ci-dessous sont le document historique, pas une preuve de mise en production.

## 1. Sécurité et confidentialité (priorité absolue)

1. **Autorisation côté serveur** pour chaque lecture : narrateur, éditeur invité et actif, acheteur (uniquement « famille »), support (autorisation temporaire journalisée). Reprendre les règles de `src/lib/rules.ts` (`canRead`, `composeBook`) comme spécification et les tester côté API.
2. **Stockage chiffré** des réponses, enregistrements et photos (stockage objet privé, URL signées à courte durée).
3. **Journal d'accès** : chaque lecture par l'équipe Filémoire doit être tracée et visible par le narrateur.
4. **Suppression** : procédure serveur avec délai de rétractation, purge des sauvegardes et des fichiers, et preuve de suppression.
5. **Consentements** horodatés et versionnés (texte affiché, date, version). Revue juridique (RGPD, données de personnes âgées, droit à l'image des personnes photographiées).
6. **Authentification** : lien magique ou code à usage unique, sessions courtes, protection CSRF, limitation des tentatives.

## 2. Intégrations réelles

- **Paiement** : page hébergée par un prestataire (ex. Stripe Checkout) ; webhooks signés et idempotents. Ne jamais collecter de numéro de carte dans un formulaire maison.
- **E-mails** : service transactionnel, domaine authentifié (SPF, DKIM, DMARC) et désinscription des rappels.
- **Transcription** : fournisseur choisi après tests de précision sur des voix âgées et des accents. Résultat toujours présenté comme une proposition à relire, avec l'audio d'origine. Coût et délai à surveiller (KPI du dossier).
- **Impression** : génération serveur du PDF selon la fiche technique de l'imprimeur retenu (format, fonds perdus, profils couleur, polices incorporées, résolution), validation sur épreuve physique, imprimeur de secours.
- **QR audio** : jetons opaques non devinables, révocables, page d'écoute protégée, hébergement garanti dans la durée.

## 3. Produit et éditorial

- Figer les 52 questions et les parcours thématiques avec la direction éditoriale (checklist du dossier).
- Bêta de 30 familles avec suivi manuel. Indicateurs : activation du narrateur, taux de réponse, abandon, temps de support.
- Tests utilisateurs avec des seniors : taille du texte, compréhension du micro, autonomie.
- Version bilingue : flux de traduction avec relecture humaine.
- Dates limites d'impression pour Noël affichées dans le tunnel d'achat.

## 4. Technique

- Remplacer l'état local (Zustand + localStorage) par des appels à l'API, en gardant le cache local uniquement pour les brouillons hors ligne.
- Envoi des fichiers audio et photos par morceaux, avec reprise en cas de coupure (connexions mobiles).
- Observabilité : journaux structurés sans contenu personnel, alertes sur les échecs de transcription et d'impression.
- Accessibilité : audit WCAG 2.1 AA complet, tests avec NVDA, VoiceOver et TalkBack.
- Tests de charge sur la période de Noël ; plafonnement des cohortes.
