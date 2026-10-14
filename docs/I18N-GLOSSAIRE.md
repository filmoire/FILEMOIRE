# Filémoire — English translation brief

Filémoire is a French family-memory service: a relative buys a gift; an older person (the storyteller) answers one guided question per week (in writing or aloud), adds photos, and the memories become a printed book that the storyteller approves. This is a clickable PROTOTYPE: payment, e-mails, transcription and printing are simulated, and the UI says so.

Style: British English. Warm, plain, respectful, short sentences; readable by older adults. No jargon. Use curly quotes “ ” instead of « ». Remove French spaces before ? ! : ;.

## Mandatory glossary
- narrateur / narratrice / narrateur·rice → storyteller
- éditeur familial → family editor ; acheteur / acheteuse → gift buyer (or "buyer" when short)
- souvenir → memory ; souvenirs → memories ; récit → story
- parcours → journey ; question de la semaine → question of the week ; raconter → tell ; racontée(s) → told
- passer une question → skip ; reporter → postpone ; brouillon → draft
- livre → book ; aperçu → preview ; valider / validation (du livre) → approve / approval ; masquer du livre → hide from the book
- préflight → preflight ; impression → printing ; expédié → shipped ; livré → delivered
- Équipe Filémoire / Opérations → Filémoire team / Operations
- transcription simulée → simulated transcription ; paiement test / simulé → test payment / simulated payment
- code famille → family code ; QR audio → audio QR code
- Offer names: Filémoire Essentiel → Filémoire Essential ; Filémoire Héritage → Filémoire Heritage ; Filémoire Voix → Filémoire Voice ; Filémoire Bilingue → Filémoire Bilingual ; Filémoire Accompagné → Filémoire Accompanied. Short forms: Essentiel → Essential, Héritage → Heritage, Voix → Voice.
- Chapters: Origines → Origins ; Enfance → Childhood ; Famille → Family ; École et jeunesse → School and youth ; Travail → Work ; Migration et voyages → Migration and travel ; Amour et amitiés → Love and friendship ; Épreuves → Hardships ; Traditions → Traditions ; Valeurs → Values
- Journeys: Une vie en 52 questions → A life in 52 questions ; Migration et double culture → Migration and two cultures ; Métier et savoir-faire → Trade and know-how ; Histoire d'un couple → A couple's story ; Parentalité → Parenthood ; Recettes → Recipes ; Retraite et héritage professionnel → Retirement and professional legacy
- Prices: "99 €" → "€99" ; "299 – 449 €" → "€299 – €449" ; "TTC indicatif" → "indicative, incl. VAT"
- Relations: Ma mère → My mother ; Mon père → My father ; Ma grand-mère → My grandmother ; Mon grand-père → My grandfather ; Un proche → A relative ; Autre → Other
- Visibility: Moi seul·e → Only me ; Moi et mon éditeur familial → Me and my family editor ; Ma famille (acheteur et éditeur) → My family (buyer and editor)
- Slogan: « Une question à la fois, une vie à transmettre. » → “One question at a time, a life to pass on.” ; « Offrez des questions aujourd'hui. Recevez une histoire de famille pour toujours. » → “Give questions today. Receive a family story forever.”
- Keep unchanged: Filémoire, Prototype, people's names (Madeleine, Sophie, Thomas Martin, Rose Delmas, Joseph, Marie, Yves, Anne…), place names (Douarnenez, Quimper, Tréboul, Lyon, Agen, Toulouse, Moissac…), e-mail addresses, codes (FM-2026-…).

## Placeholders
Keys may contain {0}, {1}… = values inserted at runtime (names, numbers, dates, other phrases). Keep every placeholder that carries meaning; you may reorder them. A placeholder that only carries a French plural/agreement letter (e.g. the "{1}" in "{0} question{1} racontée{2}") may be dropped or reused if English needs it. Never invent new placeholders.

Some keys are fragments (e.g. "Pour", "et {0}", "(facultatif)") — translate them as fragments. A few keys are technical noise (code, file names): return them unchanged.

## Output
Write ONE JSON object { "<french key exactly as given>": "<english>" } with every key of your chunk, valid JSON (escape quotes), UTF-8.
