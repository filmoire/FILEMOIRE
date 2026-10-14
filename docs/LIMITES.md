# Limites connues et éléments simulés

## Simulé (et signalé à l'écran)

| Élément | Ce que fait le prototype | Ce qu'il ne fait pas |
|---|---|---|
| Paiement | Boutons « Simuler un paiement accepté / refusé » | Aucun prestataire, aucune carte demandée ni stockée |
| E-mails | Boîte de réception de démonstration | Aucun envoi réel |
| Transcription | Texte de remplacement explicitement marqué « [TRANSCRIPTION SIMULÉE] », à remplacer par le narrateur avant validation | Aucune reconnaissance vocale ; aucun texte n'est jamais écrit à la place du narrateur |
| Préflight | Liste de contrôles indicatifs (pages, résolution des photos) | Aucune vérification d'un vrai PDF selon la fiche technique d'un imprimeur |
| PDF | Impression du navigateur (« Enregistrer au format PDF »), marquée « Aperçu illustratif » | Ce n'est **pas** un fichier prêt pour l'imprimeur |
| Impression et expédition | Statuts, incidents, numéro de suivi fictif (`SIM-…`) | Aucun imprimeur ni transporteur contacté |
| Horloge | Bouton « +1 semaine » pour démontrer cadence et rappels | — |
| Connexion | Choix du rôle ; lien de connexion simulé | Aucune authentification réelle |

## Sécurité et données

- **Les autorisations sont vérifiées dans le navigateur.** Elles démontrent le comportement attendu mais n'offrent aucune sécurité : n'importe qui peut modifier le stockage local. En production, tout contrôle doit être fait par le serveur.
- **Stockage** : l'état est dans `localStorage` et les médias importés dans IndexedDB, **dans ce navigateur uniquement**. Ils ne sont ni chiffrés, ni sauvegardés, ni partagés entre appareils. Ils peuvent être effacés par le navigateur (navigation privée, nettoyage). Si IndexedDB est indisponible, les médias restent en mémoire et disparaissent au rechargement.
- **QR audio** : le QR pointe vers l'adresse de la page en cours. Le « code famille » est vérifié côté navigateur. Les points suivants exigent une infrastructure serveur : expiration des liens, stockage audio protégé, journal des écoutes et durabilité des QR imprimés sur des décennies.
- **Demande de suppression** : enregistrée et annulable, mais aucune suppression définitive n'est exécutée.

## Fonctionnelles

- Questions : 52 questions de démonstration, dont les 10 exemples du dossier ; elles restent à valider par la direction éditoriale. Les questions ajoutées côté Opérations s'appliquent aux nouveaux parcours.
- Pagination du livre approximative (estimation du texte par page) ; pas de césure fine ni de gestion des veuves et orphelines.
- Un seul éditeur familial actif par livre ; pas de « contributeurs » multiples (prévu au dossier, hors prototype).
- Filémoire Bilingue et Accompagné : demande de devis uniquement.
- Traduction anglaise : produite avec assistance et vérifiée automatiquement (aucun texte français restant), mais **pas encore relue par un rédacteur anglophone**. À faire avant toute diffusion à des clients anglophones.
- Les données de démonstration sont créées dans la langue active au moment de la réinitialisation ; un texte saisi ou créé dans une langue n'est jamais traduit ensuite (comportement voulu pour de vraies données).
- Les titres d'onglet du navigateur sont traduits côté client, après le chargement de la page.
- Testé sur Chromium (bureau et mobile émulé). Firefox, Safari et iOS n'ont pas été testés. Aucun test avec de vrais lecteurs d'écran ni avec des utilisateurs seniors.
- Le micro des tests automatisés est simulé par Chromium : l'enregistrement réel fonctionne, mais aucune voix réelle n'a été testée.

## Hypothèses à valider (voir PLAN.md §5)

Voix dès Héritage (QR réservé à Voix), prix des options dans les fourchettes du dossier, cadence hebdomadaire par défaut, visibilité « Moi seul·e » par défaut, toutes les modifications de l'éditeur soumises à validation.
