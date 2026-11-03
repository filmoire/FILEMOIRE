// Editorial draft only. Publishing this document does not grant launch approval.
// Each pair is [French, English]; review both languages when updating the policy.
export type LegalText = readonly [string, string];
type Section = { id: string; title: LegalText; paragraphs: LegalText[] };

export const LEGAL_LABELS = {
  title: ["Confidentialité et conditions", "Privacy and terms"],
  intro: [
    "Comprendre l’usage de vos données, les accès à votre récit et les règles de votre espace Filémoire.",
    "Understand how your data is used, who can access your story and the rules for your Filémoire workspace.",
  ],
  version: [
    "Projet du 3 novembre 2026 · Version 0.1",
    "Draft dated 3 November 2026 · Version 0.1",
  ],
  draftTitle: [
    "Document de travail — à compléter et à valider",
    "Working draft — completion and review required",
  ],
  draftBody: [
    "Ce projet décrit la version de test de Filémoire. L’identité de l’éditeur, le contact dédié à vos droits, les durées de conservation et les conditions des prestataires restent à confirmer avant l’accueil du public. Il ne constitue pas une validation juridique. Pendant les essais, utilisez des récits fictifs et des fichiers de test.",
    "This draft describes the test version of Filémoire. The operator’s identity, the contact for your rights, retention periods and provider arrangements still need confirmation before public launch. It is not legal approval. Use fictional stories and test files during testing.",
  ],
  navigation: ["Dans ce document", "In this document"],
  operatorTitle: ["Mentions légales", "Legal notice"],
  operatorIntro: [
    "Filémoire est le nom du service. Le nom commercial ne permet pas, à lui seul, d’identifier l’entreprise ou la personne qui l’exploite et assume la responsabilité du traitement des données.",
    "Filémoire is the service name. The brand alone does not identify the company or person operating it and responsible for processing personal data.",
  ],
  missing: ["À renseigner par l’éditeur", "To be supplied by the operator"],
  hostingTitle: ["Services techniques utilisés", "Technical services used"],
  hostingNote: [
    "Les dénominations légales, adresses et coordonnées des hébergeurs, leurs contrats, les régions effectivement utilisées, les sous-traitants et les éventuels transferts hors de l’Espace économique européen doivent être vérifiés et ajoutés avant validation. Ce projet ne garantit pas un hébergement exclusivement européen.",
    "The hosts’ legal names, addresses and contact details, contracts, actual regions, subprocessors and any transfers outside the European Economic Area must be checked and added before approval. This draft does not promise exclusively European hosting.",
  ],
  privacyTitle: ["Politique de confidentialité", "Privacy policy"],
  termsTitle: ["Conditions d’utilisation", "Terms of use"],
  termsIntro: [
    "Projet de règles pour la version de test. Ces conditions ne constituent pas des conditions générales de vente et ne permettent pas, à elles seules, l’ouverture des commandes.",
    "Proposed rules for the test version. These are not terms of sale and do not, by themselves, authorise opening orders.",
  ],
  contactTitle: [
    "Contact et exercice des droits",
    "Contact and exercising your rights",
  ],
  contactBody: [
    "Le formulaire du site permet de transmettre une question à l’équipe. Le nom du responsable et l’adresse dédiée aux demandes de protection des données restent à renseigner dans les mentions légales ci-dessus. Ce formulaire ne remplace pas ces informations manquantes.",
    "The website’s contact form lets you send the team a question. The responsible person’s name and dedicated privacy address still need to be supplied in the legal notice above. This form does not replace those missing details.",
  ],
  contactLink: ["Ouvrir le formulaire de contact", "Open the contact form"],
  rightsLink: [
    "Comprendre vos droits sur le site de la CNIL",
    "Understand your rights on the CNIL website",
  ],
  complaintLink: [
    "Adresser une plainte à la CNIL",
    "Make a complaint to the CNIL",
  ],
  sourcesTitle: [
    "Références utilisées pour ce projet",
    "References used for this draft",
  ],
  back: ["Retour à l’accueil", "Back to home"],
  top: ["Haut de page", "Back to top"],
} satisfies Record<string, LegalText>;

export const OPERATOR_FIELDS: LegalText[] = [
  [
    "Nom légal de l’éditeur et responsable du traitement",
    "Legal name of the operator and data controller",
  ],
  [
    "Statut ou forme juridique ; capital social si applicable",
    "Legal status or company form; share capital where applicable",
  ],
  [
    "Adresse professionnelle ou siège social",
    "Business or registered office address",
  ],
  [
    "Immatriculation et numéro de TVA, selon le statut",
    "Registration and VAT number, as applicable",
  ],
  ["Responsable de la publication", "Person responsible for publication"],
  [
    "Adresse e-mail et téléphone de contact",
    "Contact email and telephone number",
  ],
  [
    "Contact pour la protection des données ; DPO si désigné",
    "Privacy contact; data protection officer if appointed",
  ],
];

export const LEGAL_PROVIDERS: { name: string; purpose: LegalText }[] = [
  {
    name: "Vercel",
    purpose: [
      "Affichage du site et acheminement des requêtes vers le service applicatif.",
      "Website delivery and forwarding requests to the application service.",
    ],
  },
  {
    name: "Render",
    purpose: [
      "Exécution de l’application, traitement des fichiers et des tâches différées.",
      "Running the application, processing files and background tasks.",
    ],
  },
  {
    name: "Neon",
    purpose: [
      "Base de données et stockage privé des photos, enregistrements et documents.",
      "Database and private storage for photos, recordings and documents.",
    ],
  },
  {
    name: "Resend",
    purpose: [
      "Envoi des liens de connexion et des messages nécessaires au service.",
      "Sending sign-in links and messages needed for the service.",
    ],
  },
];

export const PRIVACY_SECTIONS: Section[] = [
  {
    id: "donnees",
    title: [
      "1. Les informations utilisées",
      "1. Information used by the service",
    ],
    paragraphs: [
      [
        "Votre adresse e-mail sert à recevoir un lien de connexion et à retrouver votre compte. Le service conserve aussi le nom renseigné, les rôles, les invitations, les préférences, les dates d’activité et les autorisations liées à chaque livre.",
        "Your email address is used to send a sign-in link and identify your account. The service also stores the name you enter, roles, invitations, preferences, activity dates and permissions for each book.",
      ],
      [
        "Vous choisissez les textes, photos, légendes, enregistrements, transcriptions saisies ou corrigées, propositions familiales et éléments de mise en page à enregistrer. Les exports et versions PDF font aussi partie du projet. Ces contributions sont facultatives ; sans elles, le livre ne peut pas être constitué.",
        "You choose the text, photos, captions, recordings, manually entered or corrected transcripts, family suggestions and layout details to save. Exports and PDF versions also belong to the project. These contributions are optional; without them, a book cannot be assembled.",
      ],
      [
        "Une invitation peut contenir votre nom et votre adresse e-mail fournis par un proche. Vous restez libre de ne pas l’accepter. Le formulaire de contact recueille le nom, l’e-mail, le sujet et le message que vous saisissez.",
        "An invitation may include your name and email address supplied by a relative. You are free not to accept it. The contact form collects the name, email, subject and message you enter.",
      ],
      [
        "Les journaux techniques et de sécurité peuvent contenir des identifiants, des dates, des actions et des informations de connexion. Les hébergeurs peuvent également traiter des données techniques de requête. Les durées applicables à ces journaux restent à confirmer.",
        "Technical and security records may contain identifiers, dates, actions and connection information. Hosting providers may also process technical request data. Retention periods for these logs still need confirmation.",
      ],
    ],
  },
  {
    id: "finalites",
    title: [
      "2. Les finalités et bases juridiques proposées",
      "2. Proposed purposes and legal bases",
    ],
    paragraphs: [
      [
        "L’ouverture du compte, la sauvegarde du récit, les invitations demandées et la création de PDF fournissent le service choisi. La base envisagée est l’exécution du contrat ou de mesures précontractuelles, uniquement pour les traitements nécessaires à ce service.",
        "Account creation, saving stories, requested invitations and PDF generation provide the service you choose. The proposed basis is performance of a contract or pre-contractual steps, only for processing necessary to deliver that service.",
      ],
      [
        "La prévention des abus et la protection des accès poursuivent un objectif de sécurité. Le recours à l’intérêt légitime doit être documenté par l’éditeur. Les communications commerciales facultatives, si elles sont activées, nécessitent une base adaptée et une possibilité de retrait ; le simple usage du site ne vaut pas accord marketing.",
        "Preventing abuse and protecting access serve a security purpose. Reliance on legitimate interests must be documented by the operator. Optional marketing, if enabled, needs an appropriate basis and a way to withdraw; using the website alone is not agreement to marketing.",
      ],
      [
        "Ces bases sont des propositions à valider. Les récits peuvent révéler des données sensibles ou concerner d’autres personnes. Les conditions propres à ces données et aux contributions de mineurs doivent être arrêtées avant une ouverture publique ; n’en ajoutez pas pendant les essais.",
        "These bases are proposals for review. Stories may reveal sensitive data or concern other people. Conditions for this data and contributions involving children must be settled before public launch; do not add them during testing.",
      ],
    ],
  },
  {
    id: "acces",
    title: [
      "3. Qui peut consulter votre récit ?",
      "3. Who can read your story?",
    ],
    paragraphs: [
      [
        "Les souvenirs sont privés par défaut. Le narrateur choisit leur visibilité et les proches invités. L’acheteur peut suivre l’avancement si le narrateur l’autorise ; offrir le service ne donne pas accès au contenu des souvenirs.",
        "Memories are private by default. The narrator chooses visibility and who to invite. The buyer may follow progress when the narrator allows it; giving the service does not provide access to memories.",
      ],
      [
        "Un éditeur familial ne voit que les éléments partagés avec son rôle et propose des corrections que le narrateur peut accepter ou refuser. Un contributeur n’obtient pas automatiquement l’accès à tout le livre. Le narrateur peut retirer une invitation ou un accès.",
        "A family editor sees only items shared with their role and suggests corrections the narrator may accept or reject. A contributor does not automatically receive access to the whole book. The narrator can revoke an invitation or access.",
      ],
      [
        "Dans l’interface d’administration, l’équipe suit les informations opérationnelles. La lecture d’un récit par le support exige une autorisation temporaire accordée par le narrateur à un compte identifié. Les prestataires techniques traitent les données nécessaires au fonctionnement du service.",
        "The administration interface shows operational information. Support staff need temporary permission from the narrator, granted to an identified account, to read a story. Technical providers process data needed to operate the service.",
      ],
      [
        "Retirer un accès empêche les consultations suivantes dans le service, mais ne rappelle pas une copie déjà téléchargée ou conservée par un destinataire.",
        "Revoking access prevents further access through the service but cannot recall a copy already downloaded or kept by a recipient.",
      ],
    ],
  },
  {
    id: "medias",
    title: [
      "4. Photos, voix et protection des contenus",
      "4. Photos, voice and content protection",
    ],
    paragraphs: [
      [
        "L’enregistrement au microphone nécessite votre permission dans le navigateur. La version de test permet de conserver l’audio et de saisir ou corriger le texte manuellement ; aucun service de transcription automatique n’y est activé. Un futur service de transcription devra être présenté avant son utilisation.",
        "Recording requires microphone permission in your browser. The test version can store audio and lets you manually enter or correct text; no automatic transcription service is enabled in this version. Any future transcription service must be explained before use.",
      ],
      [
        "Les photos sont traitées pour l’affichage et les métadonnées EXIF sont retirées lors de leur réencodage. Les récits et fichiers sont chiffrés par l’application et les accès sont contrôlés. Le service déchiffre les contenus pour les afficher et produire vos documents : il ne s’agit pas d’un chiffrement de bout en bout. Certaines données de compte et de suivi restent distinctes du récit chiffré.",
        "Photos are processed for display and EXIF metadata is removed during re-encoding. Stories and files are encrypted by the application and access is controlled. The service decrypts content to display it and produce documents: this is not end-to-end encryption. Some account and operational data is stored separately from encrypted stories.",
      ],
    ],
  },
  {
    id: "conservation",
    title: ["5. Conservation et suppression", "5. Retention and deletion"],
    paragraphs: [
      [
        "Un lien de connexion est utilisable une seule fois pendant 15 minutes. La session de connexion a une validité de 7 jours, sauf déconnexion anticipée. Une invitation a une validité de 30 jours. Ces durées d’accès ne constituent pas des délais d’effacement des enregistrements correspondants.",
        "A sign-in link can be used once within 15 minutes. A sign-in session is valid for 7 days unless you sign out sooner. An invitation is valid for 30 days. These access periods are not deletion deadlines for the corresponding records.",
      ],
      [
        "Le narrateur peut exporter son récit avec ses médias et programmer la suppression du projet depuis son espace. La date et la période d’annulation sont affichées lors de la demande. Après ce délai, le traitement de suppression retire le projet, ses versions et les fichiers courants associés lorsqu’il s’exécute.",
        "The narrator can export a story with its media and schedule project deletion in the workspace. The date and cancellation period appear when the request is made. After that period, the deletion task removes the project, its versions and associated current files when it runs.",
      ],
      [
        "La suppression d’un projet ne supprime pas automatiquement tout le compte, les demandes de support ou d’éventuels justificatifs de commande. Les sauvegardes et versions conservées par les fournisseurs nécessitent un traitement distinct. Les durées finales, la purge des sauvegardes et la procédure de suppression du compte restent à définir et à valider ; aucun effacement immédiat de toutes les copies n’est promis.",
        "Deleting a project does not automatically erase the entire account, support requests or any order records. Backups and provider-held versions require separate handling. Final retention periods, backup purging and the account deletion procedure still need to be defined and approved; immediate erasure of every copy is not promised.",
      ],
    ],
  },
  {
    id: "cookies",
    title: [
      "6. Cookies et stockage du navigateur",
      "6. Cookies and browser storage",
    ],
    paragraphs: [
      [
        "Un cookie de session permet de rester connecté pendant sa durée de validité. La préférence français/anglais est conservée dans ce navigateur jusqu’à son effacement. Un identifiant temporaire de téléversement permet de reprendre un envoi dans le même onglet ; ce stockage ne contient pas les fichiers eux-mêmes.",
        "A session cookie keeps you signed in for its validity period. Your French/English preference stays in this browser until cleared. A temporary upload identifier allows an upload to resume in the same tab; this browser storage does not contain the files themselves.",
      ],
      [
        "L’application actuellement examinée n’intègre pas de traceur publicitaire ni de mesure d’audience. La configuration finale des outils d’hébergement doit être vérifiée avant publication définitive. Tout ajout ultérieur de suivi devra être expliqué et accompagné du choix requis.",
        "The application reviewed here has no integrated advertising tracker or audience analytics. Final hosting-tool settings must be checked before the notice is finalised. Any future tracking must be explained and accompanied by the required choice.",
      ],
    ],
  },
  {
    id: "droits",
    title: ["7. Vos choix et vos droits", "7. Your choices and rights"],
    paragraphs: [
      [
        "Depuis votre livre, vous pouvez modifier les souvenirs, ajuster les partages, arrêter les rappels, exporter le projet et demander sa suppression. Les demandes portant sur l’ensemble du compte nécessitent un traitement distinct.",
        "Within your book, you can edit memories, change sharing, stop reminders, export the project and request its deletion. Requests covering your entire account need separate handling.",
      ],
      [
        "Selon les conditions applicables, vous disposez de droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Lorsqu’un traitement repose sur le consentement, vous pouvez le retirer sans remettre en cause les traitements antérieurs licites. Vous pouvez saisir la CNIL ou l’autorité de contrôle compétente.",
        "Subject to the applicable conditions, you have rights of access, correction, erasure, restriction, objection and portability. Where processing relies on consent, you can withdraw it without affecting earlier lawful processing. You may complain to the CNIL or the competent supervisory authority.",
      ],
      [
        "Le contact dédié et la procédure de vérification d’identité pour ces demandes doivent être publiés avant validation de cette politique. N’envoyez pas de mot de passe ni de récit sensible dans un premier message de contact.",
        "The dedicated contact and identity-verification procedure for these requests must be published before this policy is approved. Do not include passwords or sensitive stories in an initial contact message.",
      ],
    ],
  },
];

export const TERMS_SECTIONS: Section[] = [
  {
    id: "service",
    title: ["Le service et son périmètre", "The service and its scope"],
    paragraphs: [
      [
        "Filémoire permet de préparer un récit de famille, d’y associer des médias, de collaborer sur les éléments autorisés et de produire un PDF. La version de test est limitée à des essais ; achats, commandes d’impression et transcription automatique restent désactivés. Une formule affichée n’est pas une commande confirmée.",
        "Filémoire helps you prepare a family story, attach media, collaborate on authorised content and produce a PDF. The test version is for testing only; purchases, print orders and automatic transcription remain disabled. A displayed package is not a confirmed order.",
      ],
    ],
  },
  {
    id: "compte",
    title: ["Votre compte et les invitations", "Your account and invitations"],
    paragraphs: [
      [
        "Utilisez une adresse e-mail dont vous contrôlez l’accès et gardez les liens de connexion personnels. Invitez uniquement les personnes concernées par votre projet. Chaque rôle conserve ses propres autorisations ; l’accès à un livre n’accorde pas d’accès aux autres livres.",
        "Use an email address you control and keep sign-in links private. Invite only people involved in your project. Each role has its own permissions; access to one book does not grant access to other books.",
      ],
    ],
  },
  {
    id: "contenus",
    title: [
      "Vos contenus et ceux de vos proches",
      "Your content and your relatives’ content",
    ],
    paragraphs: [
      [
        "Vous conservez les droits que vous détenez sur vos contributions. Vous devez disposer des droits et autorisations nécessaires pour ajouter et partager des textes, photos ou voix, notamment lorsqu’ils concernent d’autres personnes. Évitez les contenus illicites ou portant atteinte aux droits d’autrui.",
        "You retain the rights you hold in your contributions. You must have the rights and permissions needed to add and share text, photos or voices, particularly where they concern other people. Avoid unlawful material or material that infringes others’ rights.",
      ],
      [
        "La permission nécessaire au service doit être limitée à la conservation, au traitement, à l’affichage, au partage que vous demandez et à la génération de vos documents. Ce projet ne prévoit aucune cession générale de vos droits sur les souvenirs. Les modalités contractuelles définitives restent à approuver.",
        "Permission needed to operate the service should be limited to storing, processing, displaying, sharing as you request and generating your documents. This draft does not propose a general assignment of rights to your memories. Final contractual arrangements still need approval.",
      ],
    ],
  },
  {
    id: "disponibilite",
    title: [
      "Relecture, disponibilité et copies",
      "Review, availability and copies",
    ],
    paragraphs: [
      [
        "Relisez les textes, légendes, propositions et PDF avant de les valider ou de les partager. Les conditions d’une éventuelle impression devront être communiquées avant toute commande.",
        "Review text, captions, suggestions and PDFs before approving or sharing them. Terms for any future printing service must be provided before an order is placed.",
      ],
      [
        "Le service de test peut connaître des interruptions et des délais de traitement. Conservez vos originaux et téléchargez régulièrement un export. Cette information ne supprime aucun droit légal applicable et ne constitue pas une garantie de disponibilité permanente.",
        "The test service may experience interruptions and processing delays. Keep your originals and download exports regularly. This information does not remove applicable statutory rights or guarantee permanent availability.",
      ],
    ],
  },
  {
    id: "modifications",
    title: ["Évolution du service", "Changes to the service"],
    paragraphs: [
      [
        "La date et la version de ce document permettent d’identifier le texte consulté. L’identité de l’opérateur, le public admis, les règles de conservation, la gestion des réclamations et les conditions commerciales devront être finalisés avant lancement. Les changements importants devront être portés à la connaissance des utilisateurs concernés.",
        "The date and version identify the document you are reading. The operator’s identity, eligible audience, retention rules, complaints process and commercial terms must be finalised before launch. Material changes must be communicated to affected users.",
      ],
    ],
  },
];

export const LEGAL_SOURCES: { label: LegalText; href: string }[] = [
  {
    label: [
      "Service Public — mentions légales",
      "Service Public — legal notices (French)",
    ],
    href: "https://entreprendre.service-public.gouv.fr/vosdroits/F37351?lang=fr",
  },
  {
    label: [
      "CNIL — information des personnes",
      "CNIL — informing people (French)",
    ],
    href: "https://www.cnil.fr/fr/informer-les-personnes",
  },
  {
    label: ["CNIL — bases légales", "CNIL — legal bases (French)"],
    href: "https://www.cnil.fr/fr/les-bases-legales",
  },
  {
    label: [
      "CNIL — durées de conservation",
      "CNIL — retention periods (French)",
    ],
    href: "https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees",
  },
];
