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
    "Projet du 4 novembre 2026 · Version 0.3",
    "Draft dated 4 November 2026 · Version 0.3",
  ],
  draftTitle: [
    "Document de travail — à compléter et à valider",
    "Working draft — completion and review required",
  ],
  draftBody: [
    "Ce projet reprend les informations communiquées pour Intertrad, à Paris, France. L’adresse postale complète, le statut juridique, les durées de conservation, les engagements des prestataires et les conditions commerciales restent à compléter et à faire relire avant validation. Les achats et impressions ne sont pas ouverts. Pendant les essais, utilisez des récits fictifs et des fichiers de test.",
    "This draft uses the information supplied for Intertrad in Paris, France. The full postal address, legal status, retention periods, provider arrangements and commercial terms still require completion and review before approval. Purchases and printing are not open. Use fictional stories and test files during testing.",
  ],
  navigation: ["Dans ce document", "In this document"],
  operatorTitle: ["Mentions légales", "Legal notice"],
  operatorIntro: [
    "Filémoire est le service présenté par Intertrad, à Paris, France. Les coordonnées ci-dessous proviennent de l’opérateur ; les mentions signalées comme incomplètes doivent être précisées avant publication définitive.",
    "Filémoire is the service presented by Intertrad in Paris, France. The details below were supplied by the operator; items marked incomplete must be filled in before final publication.",
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
    "Projet de conditions pour l’espace de test. La politique commerciale et de remboursement ci-dessous prépare une ouverture ultérieure ; elle ne vaut ni ouverture des commandes ni approbation de conditions générales de vente définitives.",
    "Draft terms for the test workspace. The sales and refund policy below prepares for a later launch; it does not open orders or approve final terms of sale.",
  ],
  refundsTitle: [
    "Ventes, annulation et remboursements",
    "Sales, cancellation and refunds",
  ],
  refundsIntro: [
    "Projet pour les futures offres payantes — à finaliser avant toute vente. Aucun prix, délai d’impression, avantage commercial ou renoncement n’est approuvé par la seule publication de ce texte.",
    "Draft for future paid offers — finalise before any sale. Publishing this text alone does not approve prices, printing deadlines, commercial benefits or any waiver.",
  ],
  contactTitle: [
    "Contact et exercice des droits",
    "Contact and exercising your rights",
  ],
  contactBody: [
    "Pour toute question, réclamation, demande de remboursement ou demande relative à vos données, contactez Intertrad à admin-dev@filemoire.fr. Indiquez l’adresse de votre compte et l’objet de la demande, sans joindre de lien de connexion, mot de passe ou récit sensible. Le formulaire de contact reste également disponible.",
    "For questions, complaints, refund requests or requests about your data, contact Intertrad at admin-dev@filemoire.fr. Include your account email and the purpose of your request, without attaching a sign-in link, password or sensitive story. The contact form is also available.",
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

export const LEGAL_CONTACT_EMAIL = "admin-dev@filemoire.fr";

export const OPERATOR_FIELDS: { label: LegalText; value: LegalText }[] = [
  {
    label: [
      "Éditeur et responsable du traitement — nom communiqué",
      "Operator and data controller — supplied name",
    ],
    value: [
      "Intertrad — dénomination et statut juridique à confirmer",
      "Intertrad — legal identity and status to be confirmed",
    ],
  },
  {
    label: [
      "Statut ou forme juridique ; capital social si applicable",
      "Legal status or company form; share capital where applicable",
    ],
    value: ["À préciser par Intertrad", "To be specified by Intertrad"],
  },
  {
    label: [
      "Adresse professionnelle ou siège social",
      "Business or registered office address",
    ],
    value: [
      "Rue Ordener, 75018 Paris, France — numéro de voie à compléter",
      "Rue Ordener, 75018 Paris, France — street number required",
    ],
  },
  {
    label: [
      "Immatriculation et numéro de TVA, selon le statut",
      "Registration and VAT number, as applicable",
    ],
    value: [
      "Aucun numéro fourni ; situation et applicabilité à confirmer",
      "No number supplied; status and applicability to be confirmed",
    ],
  },
  {
    label: [
      "Responsable de la publication",
      "Person responsible for publication",
    ],
    value: ["À désigner par Intertrad", "To be identified by Intertrad"],
  },
  {
    label: [
      "Contact support et confidentialité",
      "Support and privacy contact",
    ],
    value: [LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_EMAIL],
  },
  {
    label: [
      "Téléphone professionnel ; DPO si désigné",
      "Business telephone; data protection officer if appointed",
    ],
    value: [
      "Téléphone à compléter ; aucun DPO identifié dans ce projet",
      "Telephone required; no DPO identified in this draft",
    ],
  },
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
    id: "responsable",
    title: ["Responsable et périmètre", "Controller and scope"],
    paragraphs: [
      [
        "Intertrad, à Paris, France, est le nom communiqué pour l’opérateur de Filémoire et le responsable des traitements décrits ici. Vous pouvez le contacter à admin-dev@filemoire.fr. Son identité juridique et son adresse postale complète restent à confirmer dans les mentions légales.",
        "Intertrad in Paris, France is the supplied name of Filémoire’s operator and controller for the processing described here. Contact it at admin-dev@filemoire.fr. Its legal identity and full postal address still require confirmation in the legal notice.",
      ],
      [
        "Cette politique couvre le site, les espaces narrateur, acheteur et famille, les invitations, les médias et le support. Les paiements, l’impression et la transcription automatique ne sont pas actifs dans la version de test ; leurs prestataires et traitements devront être décrits avant activation.",
        "This policy covers the website, narrator, buyer and family workspaces, invitations, media and support. Payments, printing and automatic transcription are inactive in the test version; their providers and processing must be described before activation.",
      ],
    ],
  },
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
        "La gestion de votre compte, la sauvegarde du récit, les partages que vous demandez, la création de PDF et le support nécessaire fournissent le service choisi. La base proposée est l’exécution du contrat ou de mesures précontractuelles demandées, pour les seules opérations nécessaires à ce service.",
        "Managing your account, saving stories, sharing you request, PDF generation and necessary support provide the service you choose. The proposed basis is performance of the contract or requested pre-contractual steps, only for operations necessary to provide that service.",
      ],
      [
        "La prévention des abus et la protection des accès poursuivent un objectif de sécurité. Le recours à l’intérêt légitime doit être documenté par l’éditeur. Les communications commerciales facultatives, si elles sont activées, nécessitent une base adaptée et une possibilité de retrait ; le simple usage du site ne vaut pas accord marketing.",
        "Preventing abuse and protecting access serve a security purpose. Reliance on legitimate interests must be documented by the operator. Optional marketing, if enabled, needs an appropriate basis and a way to withdraw; using the website alone is not agreement to marketing.",
      ],
      [
        "Pour un destinataire qui n’a pas encore de compte, l’invitation provient du proche qui a renseigné son nom et son e-mail. La base proposée est l’intérêt légitime à transmettre cette invitation personnelle, sous réserve d’une mise en balance documentée. Le destinataire peut la refuser ou demander l’arrêt des invitations à admin-dev@filemoire.fr. Les éventuelles obligations comptables liées aux ventes devront être identifiées avant leur ouverture.",
        "For a recipient without an account, the relative who entered their name and email is the source of the invitation. The proposed basis is legitimate interests in delivering that personal invitation, subject to a documented balancing assessment. Recipients can decline or ask admin-dev@filemoire.fr to stop invitations. Any accounting obligations associated with sales must be identified before sales open.",
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
      [
        "La version examinée ne prévoit pas de vente des récits, d’utilisation des souvenirs pour entraîner une IA, ni de décision automatisée produisant des effets juridiques sur vous. Les questions sont issues d’une bibliothèque et les suggestions familiales restent soumises au narrateur. Tout changement de finalité devra faire l’objet d’une information et d’une base juridique appropriées.",
        "The reviewed version does not provide for selling stories, using memories to train AI, or automated decisions producing legal effects about you. Questions come from a library and family suggestions remain subject to narrator approval. Any change of purpose requires appropriate information and a legal basis.",
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
        "Les sessions et jetons de connexion expirés sont supprimés lors du passage de la tâche de nettoyage. Celle-ci efface aussi le contenu des tâches terminées créées depuis plus de 7 jours, mais pas nécessairement leurs métadonnées ni les copies chez les prestataires. Le fonctionnement de cette tâche dépend de la disponibilité du service.",
        "Expired sessions and login tokens are deleted when the cleanup task runs. It also clears payloads of completed jobs created more than 7 days earlier, but not necessarily their metadata or provider copies. Execution depends on service availability.",
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
        "Adressez votre demande à admin-dev@filemoire.fr en précisant le compte concerné et le droit souhaité. En cas de doute raisonnable sur votre identité, seules les informations supplémentaires nécessaires à sa vérification pourront être demandées. N’envoyez pas spontanément une pièce d’identité, un mot de passe ou votre récit complet.",
        "Send your request to admin-dev@filemoire.fr, identifying the account and right you wish to exercise. Where there is reasonable doubt about identity, only the additional information needed to verify it may be requested. Do not send identity documents, passwords or your full story without being asked.",
      ],
      [
        "Une réponse doit être apportée dans un mois suivant la réception de la demande. Si sa complexité ou le nombre de demandes justifie une prolongation, vous devez en être informé avec les motifs dans ce premier mois ; la prolongation peut atteindre deux mois supplémentaires. Vous pouvez saisir la CNIL si vous estimez que vos droits ne sont pas respectés.",
        "A response is due within one month of receiving the request. If complexity or the number of requests justifies an extension, you must be told why within that first month; the extension may be up to two additional months. You can complain to the CNIL if you believe your rights are not respected.",
      ],
    ],
  },
  {
    id: "prestataires-transferts",
    title: ["8. Prestataires et localisation", "8. Providers and location"],
    paragraphs: [
      [
        "Vercel sert le site, Render exécute l’application et les tâches de traitement, Neon conserve la base de données et les fichiers privés, et Resend transmet les e-mails de connexion et d’invitation. Les destinataires sont limités aux personnes autorisées par le narrateur, aux personnes habilitées pour l’exploitation et aux prestataires nécessaires à ces fonctions, ainsi qu’aux autorités lorsqu’une obligation légale l’impose.",
        "Vercel serves the website, Render runs the application and processing jobs, Neon stores the database and private files, and Resend delivers login and invitation emails. Recipients are limited to people authorised by the narrator, authorised operations personnel and providers needed for these functions, plus authorities where legally required.",
      ],
      [
        "Le projet Neon examiné est configuré dans la région AWS Europe centrale. Cela ne garantit pas que tous les traitements, accès de support ou sous-traitants restent dans l’Espace économique européen. Avant validation, Intertrad doit préciser les entités contractantes, pays, contrats de sous-traitance et garanties applicables aux éventuels transferts : décision d’adéquation ou autres mécanismes appropriés, notamment clauses contractuelles types lorsque nécessaires. Ces vérifications ne sont pas encore achevées.",
        "The reviewed Neon project is configured in AWS Central Europe. This does not guarantee that all processing, support access or subprocessors remain in the European Economic Area. Before approval, Intertrad must identify the contracting entities, countries, processing agreements and safeguards for any transfers: adequacy decisions or other appropriate mechanisms, including standard contractual clauses where necessary. These checks are not yet complete.",
      ],
    ],
  },
  {
    id: "tiers-mineurs",
    title: [
      "9. Récits sensibles et personnes mineures",
      "9. Sensitive stories and children",
    ],
    paragraphs: [
      [
        "La préversion est destinée aux essais avec des contenus fictifs. N’y versez pas de données de santé, convictions, informations sur la vie intime, condamnations, ni de données personnelles de mineurs ou de tiers sans cadre adapté. Le fait de pouvoir saisir un récit ou cocher une autorisation technique ne règle pas à lui seul les conditions juridiques applicables à ces données.",
        "The preview is intended for tests with fictional content. Do not add health data, beliefs, intimate-life information, criminal records, or personal data about children or third parties without an appropriate framework. Being able to enter a story or check a technical permission does not by itself meet the legal conditions for this data.",
      ],
      [
        "Avant une ouverture à de vrais récits, Intertrad doit arrêter les conditions d’accès par âge, les bases et garanties supplémentaires pour les données sensibles, l’information des tiers et les procédures d’autorisation ou de retrait adaptées. Ces décisions restent en attente ; le présent projet n’annonce pas leur mise en œuvre.",
        "Before opening to real stories, Intertrad must decide age eligibility, additional grounds and safeguards for sensitive data, information for third parties and appropriate permission or removal procedures. These decisions remain pending; this draft does not claim they have been implemented.",
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
        "La permission proposée à Intertrad est non exclusive et limitée aux opérations nécessaires pour stocker, traiter, afficher, partager selon vos choix et exporter vos contributions. Elle ne transfère pas la propriété de vos souvenirs et n’autorise pas leur exploitation publicitaire. Sa durée suit celle de la fourniture du service et des conservations légalement justifiées. Toute impression future nécessite une commande distincte et la validation de la version à imprimer.",
        "The proposed permission to Intertrad is non-exclusive and limited to operations needed to store, process, display, share according to your choices and export contributions. It does not transfer ownership of memories or permit advertising use. It lasts for service provision and legally justified retention. Any future printing requires a separate order and approval of the version to print.",
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
    id: "suspension-reclamations",
    title: [
      "Sécurité, suspension et réclamations",
      "Security, suspension and complaints",
    ],
    paragraphs: [
      [
        "N’utilisez pas le service pour diffuser des contenus illicites, usurper une identité, envoyer des invitations abusives ou tenter d’accéder aux récits d’autrui. En cas de risque de sécurité ou d’usage manifestement illicite, Intertrad peut restreindre l’accès de façon proportionnée. Sauf urgence ou interdiction légale, l’utilisateur doit pouvoir être informé du motif et demander un réexamen à admin-dev@filemoire.fr.",
        "Do not use the service for unlawful content, impersonation, abusive invitations or attempts to access other people’s stories. For a security risk or clearly unlawful use, Intertrad may proportionately restrict access. Unless urgent action or a legal prohibition prevents it, the user should be informed of the reason and able to request a review at admin-dev@filemoire.fr.",
      ],
      [
        "Pour une réclamation, indiquez le compte concerné, le problème rencontré et, le cas échéant, la référence de commande. Ces conditions ne limitent pas les garanties légales ni les recours impératifs du consommateur. Aucun tribunal exclusivement parisien n’est imposé par ce projet.",
        "For a complaint, identify the account, issue and order reference where relevant. These terms do not restrict statutory guarantees or mandatory consumer remedies. This draft does not impose exclusive jurisdiction in Paris.",
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

export const REFUND_SECTIONS: Section[] = [
  {
    id: "offre-commande",
    title: ["1. Offre, prix et commande", "1. Offer, prices and orders"],
    paragraphs: [
      [
        "La préversion ne permet pas d’acheter. Pour une future vente, la fiche et le récapitulatif devront préciser les contenus inclus, la durée d’accès, les quantités, le format et la finition du livre, le prix total et les taxes applicables, les frais de livraison, la zone desservie et les délais convenus. Aucune exonération de TVA n’est déduite de l’absence actuelle de numéro communiqué.",
        "Purchases are unavailable in the preview. For a future sale, the offer and order summary must specify included content, access duration, quantities, book size and finish, total price and applicable taxes, delivery charges, destination coverage and agreed deadlines. No VAT exemption is inferred from the absence of a supplied number.",
      ],
      [
        "Le client devra pouvoir vérifier et corriger sa commande avant un bouton indiquant clairement l’obligation de payer. Les conditions acceptées et la confirmation seront fournies sur un support durable. Stripe est le prestataire de paiement envisagé, pas un service de paiement déjà ouvert dans cette préversion. Les prix définitifs, la durée des formules et le parcours de paiement restent à approuver et à tester.",
        "Customers must be able to review and correct an order before a button clearly indicating the obligation to pay. Accepted terms and confirmation will be supplied on a durable medium. Stripe is the intended payment provider, not an active checkout service in this preview. Final prices, package duration and checkout flow still need approval and testing.",
      ],
    ],
  },
  {
    id: "cadeau-refus",
    title: [
      "2. Cadeaux et refus d’invitation",
      "2. Gifts and declined invitations",
    ],
    paragraphs: [
      [
        "Le destinataire reste libre d’accepter une invitation et de décider ce qu’il souhaite raconter ou partager. L’invitation a une validité technique de 30 jours. L’achat d’un cadeau ne donne pas à l’acheteur accès au récit privé et l’acceptation de l’invitation ne constitue pas une renonciation générale aux droits de rétractation.",
        "Recipients remain free to accept an invitation and decide what to tell or share. The invitation has a technical validity of 30 days. Buying a gift does not give the buyer access to private stories, and accepting an invitation is not a general waiver of withdrawal rights.",
      ],
      [
        "En cas de refus ou d’expiration, contactez admin-dev@filemoire.fr. La règle commerciale supplémentaire — remboursement, réattribution ou autre solution au-delà des droits légaux — reste à décider par Intertrad et devra être affichée avant la vente. Ce projet ne promet pas de remboursement automatique à l’expiration et ne réduit aucun droit légal.",
        "For a declined or expired invitation, contact admin-dev@filemoire.fr. Any additional commercial policy — refund, reassignment or another solution beyond statutory rights — remains for Intertrad to decide and disclose before sale. This draft does not promise an automatic refund on expiry and does not reduce statutory rights.",
      ],
    ],
  },
  {
    id: "retractation-delai",
    title: ["3. Droit de rétractation", "3. Right of withdrawal"],
    paragraphs: [
      [
        "Lorsqu’un droit de rétractation s’applique à une vente à distance, le consommateur dispose en principe de 14 jours pour notifier sa décision sans motif : à compter de la conclusion du contrat pour un service, et de la réception pour un bien. Le jour de départ n’est pas compté ; une échéance tombant un samedi, dimanche ou jour férié ou chômé est reportée au premier jour ouvrable suivant. Les règles propres aux offres combinées devront être précisées dans chaque offre.",
        "Where distance-selling withdrawal rights apply, consumers normally have 14 days to notify withdrawal without giving a reason: from contract conclusion for a service, or receipt for goods. The starting day is not counted; an expiry on a Saturday, Sunday, public holiday or non-working day moves to the next working day. Rules for combined offers must be specified for each offer.",
      ],
      [
        "Une demande claire peut être adressée à admin-dev@filemoire.fr avant l’expiration du délai ; le modèle ci-dessous peut être utilisé sans être obligatoire. Pour les contrats conclus sur une interface en ligne, une fonctionnalité gratuite de rétractation et son accusé de réception sur support durable doivent aussi être disponibles selon les règles en vigueur depuis le 19 juin 2026. Le formulaire « Se rétracter du contrat » permet d’enregistrer une déclaration, de télécharger un accusé daté et d’en demander l’envoi par e-mail. L’équipe vérifie ensuite le contrat et les droits applicables ; cet accusé ne confirme pas un remboursement exécuté. La validation juridique et les essais commerciaux restent nécessaires avant l’ouverture des ventes.",
        "A clear request can be sent to admin-dev@filemoire.fr before the deadline; the template below is optional. For contracts concluded through an online interface, a free withdrawal function with durable acknowledgement must also be available under the rules effective since 19 June 2026. The “Withdraw from a contract” form records a declaration, offers a dated acknowledgement to download and queues an email copy. The team then checks the contract and applicable rights; the acknowledgement does not confirm a completed refund. Legal review and commercial acceptance testing remain required before sales open.",
      ],
    ],
  },
  {
    id: "numerique-service",
    title: [
      "4. Service commencé et contenu numérique",
      "4. Started services and digital content",
    ],
    paragraphs: [
      [
        "Si un service payant commence avant la fin du délai à votre demande expresse, une rétractation peut entraîner le paiement de la seule part proportionnée du service déjà fourni, lorsque l’information préalable et les autres conditions légales sont respectées. Le droit n’est perdu après exécution complète que si les conditions légales, dont l’accord exprès et la reconnaissance préalable de cette perte, sont réunies.",
        "If a paid service starts early at your express request, withdrawal may require payment only for the proportion already provided, where prior information and other legal conditions are met. The right is lost after full performance only if the legal conditions, including express agreement and prior acknowledgement of that loss, are satisfied.",
      ],
      [
        "Pour un contenu numérique payant sans support matériel fourni avant la fin du délai, l’exception exige notamment votre accord préalable exprès pour commencer, la reconnaissance de la perte du droit et une confirmation sur support durable. Une simple connexion, une invitation acceptée, une case précochée ou une validation de PDF ne suffit pas à établir ces conditions. La qualification de chaque formule et les consentements distincts doivent être validés avant vente.",
        "For paid digital content without a physical medium supplied early, the exception requires, among other conditions, prior express consent to start, acknowledgement of losing the right, and confirmation on a durable medium. Signing in, accepting an invitation, a pre-ticked box or approving a PDF does not establish those conditions. Each package’s classification and separate consents must be validated before sale.",
      ],
    ],
  },
  {
    id: "livre-personnalise",
    title: [
      "5. Livre personnalisé et mise en fabrication",
      "5. Personalised books and production",
    ],
    paragraphs: [
      [
        "Un livre fabriqué selon vos spécifications ou nettement personnalisé peut relever de l’exception légale au droit de rétractation pour ce bien. Cette information doit être présentée avant commande. Elle ne s’étend pas automatiquement aux autres services du coffret et ne dépend pas seulement du démarrage de l’impression. Elle n’écarte jamais les garanties relatives à un livre défectueux, endommagé ou non conforme.",
        "A book made to your specifications or clearly personalised may fall within the statutory withdrawal exception for that item. This must be explained before ordering. The exception does not automatically cover other services in a bundle and does not depend solely on printing having started. It never removes guarantees for a defective, damaged or non-conforming book.",
      ],
      [
        "Le narrateur relit et approuve la version destinée à l’impression. Cette approbation ne décharge pas Intertrad d’une erreur de fabrication ou d’une différence avec le fichier approuvé. Pour une modification ou annulation commerciale hors rétractation légale, contactez l’équipe : sa possibilité et ses éventuels coûts devront être annoncés avant achat selon le processus réel de l’imprimeur. Aucun imprimeur ni délai de production n’est confirmé par ce projet.",
        "The narrator reviews and approves the print version. Approval does not release Intertrad from manufacturing errors or differences from the approved file. For a commercial change or cancellation outside statutory withdrawal, contact the team: availability and any costs must be disclosed before purchase based on the printer’s actual process. This draft does not confirm a printer or production deadline.",
      ],
    ],
  },
  {
    id: "remboursement-retour",
    title: ["6. Remboursements et retours", "6. Refunds and returns"],
    paragraphs: [
      [
        "En cas de rétractation légale, le remboursement intervient sans retard injustifié, au plus tard 14 jours après notification, avec le moyen de paiement initial sauf accord exprès pour un autre moyen sans frais. Les frais de livraison standard sont inclus ; le supplément choisi pour une livraison plus chère ne l’est pas nécessairement. Pour un bien à retourner, le remboursement peut être différé jusqu’à sa récupération ou à la preuve de son expédition, selon le premier événement.",
        "For statutory withdrawal, refunds are made without undue delay and within 14 days of notification, using the original payment method unless another fee-free method is expressly agreed. Standard delivery charges are included; an upgrade to more expensive delivery need not be. For returned goods, reimbursement may be held until receipt or evidence of dispatch, whichever comes first.",
      ],
      [
        "Lorsqu’un retour au titre de la rétractation est applicable, le bien doit être renvoyé dans les 14 jours suivant la notification. Les frais directs ne peuvent être mis à votre charge que si vous en avez été informé avant achat et qu’Intertrad ne les prend pas en charge. L’adresse et la procédure de retour restent à fournir avant vente. Les retours pour non-conformité suivent leurs garanties propres, sans frais imposés au consommateur pour la mise en conformité.",
        "Where a withdrawal return applies, goods must be sent back within 14 days of notification. Direct return costs can be charged to you only if disclosed before purchase and not covered by Intertrad. The return address and procedure must be supplied before sales. Non-conformity returns follow their separate guarantees, without charging the consumer to bring the product into conformity.",
      ],
    ],
  },
  {
    id: "garanties-livraison",
    title: [
      "7. Livraison, défauts et garanties",
      "7. Delivery, defects and guarantees",
    ],
    paragraphs: [
      [
        "Les délais et frais de livraison seront convenus avant la commande. Un retard, une absence de livraison, un défaut d’impression ou un produit endommagé doivent être signalés à admin-dev@filemoire.fr avec la référence de commande et les éléments utiles. Des photographies peuvent aider, sans imposer l’envoi de pages privées ni une courte date limite qui supprimerait vos droits légaux. Intertrad reste votre interlocuteur pour la vente.",
        "Delivery times and charges will be agreed before ordering. Report delays, non-delivery, print defects or damage to admin-dev@filemoire.fr with the order reference and relevant details. Photos can help, without requiring private pages or imposing a short deadline that removes statutory rights. Intertrad remains your contact for the sale.",
      ],
      [
        "Les garanties légales de conformité et des vices cachés restent applicables selon leurs conditions. Pour un livre neuf, la garantie légale de conformité couvre les défauts apparaissant dans les deux ans de sa délivrance. Réparation ou remplacement, puis réduction de prix ou résolution dans les cas prévus, suivent les règles légales. Les contenus et services numériques ont des règles spécifiques, notamment pour la fourniture continue. Les encadrés réglementaires adaptés à chaque offre doivent être intégrés aux CGV définitives.",
        "Statutory conformity and hidden-defect guarantees apply according to their conditions. For a new book, conformity protection covers defects appearing within two years of delivery. Repair or replacement, followed by price reduction or termination where provided, follows statutory rules. Digital content and services have specific rules, including for continuous supply. The appropriate mandatory information panels must be included in final sales terms.",
      ],
    ],
  },
  {
    id: "litiges-mediateur",
    title: ["8. Réclamations et médiation", "8. Complaints and mediation"],
    paragraphs: [
      [
        "Adressez d’abord une réclamation écrite à admin-dev@filemoire.fr. Si le différend n’est pas résolu, le consommateur peut recourir gratuitement au médiateur de la consommation compétent selon ses conditions de recevabilité. Intertrad doit adhérer au dispositif adapté et publier le nom, l’adresse et le site du médiateur avant vente : ces coordonnées sont encore manquantes et aucun médiateur n’est présenté comme déjà désigné.",
        "First send a written complaint to admin-dev@filemoire.fr. If unresolved, consumers can use the competent consumer mediator free of charge subject to admissibility conditions. Intertrad must join an appropriate scheme and publish the mediator’s name, address and website before selling: these details are still missing and no mediator is claimed to have been appointed.",
      ],
      [
        "Le droit français est proposé pour ces conditions, sans priver un consommateur des protections impératives qui lui sont applicables, notamment dans son pays de résidence habituelle. Les juridictions compétentes sont celles prévues par les règles applicables ; aucun recours légal n’est exclu.",
        "French law is proposed for these terms without depriving consumers of mandatory protections applicable to them, including in their country of habitual residence. Jurisdiction follows applicable rules; no statutory remedy is excluded.",
      ],
    ],
  },
  {
    id: "modele-retractation",
    title: [
      "9. Modèle de demande de rétractation",
      "9. Withdrawal request template",
    ],
    paragraphs: [
      [
        "À l’attention d’Intertrad — admin-dev@filemoire.fr ; adresse postale complète : [à compléter avant vente]. Je vous notifie ma décision de me rétracter du contrat concernant : [bien ou service]. Référence : [commande]. Commandé le : [date] / reçu le : [date, si applicable]. Nom du consommateur : [nom]. Adresse du consommateur : [adresse]. Date : [date]. Signature uniquement pour un envoi sur papier. Ce modèle n’a pas à être envoyé pour une simple demande d’information et ne contient aucun numéro de carte bancaire.",
        "To Intertrad — admin-dev@filemoire.fr; full postal address: [required before sales]. I notify you that I withdraw from the contract for: [goods or service]. Reference: [order]. Ordered on: [date] / received on: [date, if relevant]. Consumer’s name: [name]. Consumer’s address: [address]. Date: [date]. Signature only for paper submissions. Do not send this template for a simple enquiry; it does not require payment-card numbers.",
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
  {
    label: [
      "CNIL — délai de réponse aux demandes de droits",
      "CNIL — time limit for rights requests (French)",
    ],
    href: "https://www.cnil.fr/fr/cnil-direct/question/exercice-des-droits-informatique-et-libertes-dans-quel-delai-doit-me-repondre",
  },
  {
    label: [
      "Code de la consommation — rétractation, articles L221-18 à L221-28",
      "French Consumer Code — withdrawal, articles L221-18 to L221-28",
    ],
    href: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032226844",
  },
  {
    label: [
      "DGCCRF — rétractation et fonctionnalité en ligne depuis juin 2026",
      "DGCCRF — withdrawal and online functionality from June 2026 (French)",
    ],
    href: "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/delais-de-reflexion-ou-de-retractation-comment-sappliquent-t-ils",
  },
  {
    label: [
      "Service Public — médiation de la consommation",
      "Service Public — consumer mediation (French)",
    ],
    href: "https://entreprendre.service-public.gouv.fr/vosdroits/F33338",
  },
  {
    label: [
      "Service Public — garantie légale de conformité",
      "Service Public — statutory conformity guarantee (French)",
    ],
    href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F11094",
  },
  {
    label: [
      "Décret 2022-946 — information sur les garanties légales",
      "Decree 2022-946 — statutory guarantee information (French)",
    ],
    href: "https://www.legifrance.gouv.fr/eli/decret/2022/6/29/2022-946/jo/texte",
  },
];
