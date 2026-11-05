---
version: alpha
name: Filémoire dashboards
description: A quiet family publishing workspace, following the supplied Le fil familial and Le fil essentiel references.
colors:
  paper: "#f8f3ef"
  ink: "#432535"
  wash: "#e9dfed"
  accent: "#78506c"
  surface: "#fffdf9"
  line: "#d7c8cc"
typography:
  display:
    fontFamily: "Trebuchet MS, sans-serif"
  body:
    fontFamily: "Georgia, serif"
rounded:
  control: "30px"
  panel: "32px"
spacing:
  page-max: "1200px"
  column-gap: "42px"
components:
  button: {}
  dialog: {}
  table: {}
---

## Overview

The user supplied “Dashboard Filémoier final” on 22 October 2026. Its buyer, family editor and operations screenshots, including both empty and populated states, are the visual authority. This is a product workspace for families writing and gifting books; operational screens support the service without exposing private stories. French and English interface copy use the existing locale provider; personal text is never translated.

The signature is generous cream paper, plum typography, lilac illustration panels and fine dividing rules. Avoid generic analytics cards, gradients, heavy shadows and invented sample activity. Public pages other than the landing page, and printed books, retain their existing typography.

## Colors

Runtime ownership is model B: `src/app/dashboard.css` owns the six `--dash-*` tokens above. Its scoped dashboard recipes consume them directly. This file mirrors those values; `tailwind.config.ts` remains the owner of existing public/book and semantic error/success tokens. Focus uses accent; selection and empty panels use wash. Light theme only; forced colors remain operable.

## Typography

Trebuchet MS with sans-serif fallback for headings, navigation, controls and tables; Georgia with serif fallback for prose. Headings are regular weight, with a 48px desktop page title and 38px mobile title. Reference fonts are system fonts and need no paid service or network fetch. Saved stories and book previews preserve their own book typography.

## Layout

1200px content at a 1440px viewport; fluid gutters below 1280px. Two-line header: identity then role-specific navigation. Desktop main content starts with 54px top padding for family workspaces and 48px for operations, with natural document scrolling. Buyer home uses a 1.9:1 split with 42px gap. The editor's empty home illustration is 340px high; shared-book panels have a 40px column gap and 320px image. At 800px the columns stack, navigation wraps and images move above empty-state copy. Tables own horizontal overflow and remain semantic tables.

## Elevation & Depth

Static content is flat. Use borders for rows and lilac for summaries. Dialogs alone use existing modal overlay and elevation. Images reserve their dimensions.

## Shapes

30px pill controls, 32px illustration panels, 16px notices, and thin dividers. Existing narrator editing cards receive the shared surface treatment without changing book page composition.

## Components

`LiveShell` owns header, role navigation, locale switch, identity and footer. Shared `Button`, `Input`, `Textarea`, `Select`, `Dialog` remain canonical. `dashboard-ui.tsx` owns repeated page introductions, empty panels, status badges and pagination. Enabled controls have hover, active and keyboard focus; disabled controls remain explained and cannot activate. Loading/error states are persistent text with retry; mutations only claim success after the server acknowledges them.

`ui/notifications.tsx` owns the shared Sonner presentation for live and demo: cream surface, plum/ink typography, semantic icon and border, rounded-xl corners and the existing overlay shadow, all from `tailwind.config.ts`. Persistent `Message` notices use the same semantic colors and icons. The public sign-in card retains EB Garamond/Inter, with a quiet plum-tinted header and a full-width, stable-size submit button. Dashboard and book typography remain unchanged.

The 30 October brand correction uses the canonical `components/shell/logo.tsx` image in both dashboard header and footer, across all roles. The full illustrated logo replaces the reference screenshots’ text-only wordmark, following the user's feedback; its link returns to the current role’s home. The existing narrow-screen header wraps identity controls below the logo when needed.

The archive supplied again on 30 October contains buyer, family editor and operations references, with no narrator or public-homepage reference. Its compact question switches retain a 44px interactive target around the 36×22px visible track. Gift links use the reference's Georgia typography; ordinary form controls use Trebuchet MS. Reference demo names and counts remain replaced by authorized backend data.

## Do's and Don'ts

### Transactional emails — 4 November 2026

`src/server/email-templates.ts` owns the shared email layout and the eight active
message variants. Its color adapter imports `tailwind.config.ts`, the existing
public brand owner, rather than maintaining another palette. Cream stationery,
the illustrated PNG logo, plum headings/buttons and a pale plum personal-message
panel extend the public sign-in identity. Georgia and Arial replace remote fonts
for email-client compatibility. The signature is the personal message presented
as a note with a fine gold edge, followed by “Vos souvenirs restent à vous.”

Emails use a fluid 620px table layout, inline critical styles, a mobile adjustment
at 480px, meaningful image alt text and a plain-text alternative. One clear
action is followed by a copyable URL. Dynamic names/messages are escaped; no
tracking pixels or remote font resources are added. Existing French transactional
copy remains French; personal messages are never translated. UI language storage
and email localization are not changed in this work.

The app uses passwordless, single-use sign-in links. The sign-in template is also
the account-access recovery email; no nonexistent password-reset flow is offered.
Preview examples contain fictional data and invalid sample tokens only.

- Use actual accessible account data and server counts. Never copy mock names, dates, totals or shipping references into live screens.
- Preserve narrator authority, MFA, scoped support grants, immutable approved PDFs and unsaved recording protection.
- Translate interface copy, never a person's name, narrative, caption or cover title.
- Keep safe primary actions separate from refunds, deletion and access revocation.

## Designer completion — 26 October 2026

The seven-step gift flow preserves the supplied first-step composition and extends it with the same typography, controls and lilac summary. Shared books use the illustrated home empty state and a plain empty panel on the books tab. Support uses full-width ruled rows. Question groups follow chapter order with compact metadata tags and canonical activation switches. Orders and projects use operational metadata columns from the reference. The added language, account, refresh and protected operational controls remain available for a working application.

## Public landing page — 5 November 2026

The user supplied `Filemoire - Landing page.zip` and requested this design with the illustrated logo. Its standalone HTML (p25 / p48) now owns the homepage composition: an open typographic hero with two illustrations, three journey steps, a voice example, narrator privacy, the book, packages, FAQ and closing invitation. The original five images are optimized as local WebP assets in `public/landing`; their content and crops follow the reference.

`src/app/landing.css` owns the scoped `--landing-*` tokens: paper #f8f3ef, ink #432535, wash #e9dfed, accent #78506c, line #d5c8bc. Trebuchet MS headings and Georgia body copy intentionally replace the previous EB Garamond/Inter homepage treatment. The desktop container is 1280px, the hero heading 83px, section headings 54px, and image/button radii 40px. Columns stack below 700px, with a tablet adjustment for navigation and pricing. These rules do not change the dashboards, sign-in, legal pages or printed books.

The canonical illustrated logo appears in the header and footer as explicitly requested, replacing the reference's text-only wordmark. Functional differences from the static mockup are deliberate: sample-book links open the existing book preview, package links select the existing gift flow, quote/contact buttons open the existing backend-connected form, and the footer retains language, legal and withdrawal links. The story example uses native disclosure; imagery reserves dimensions; focused controls are visible; motion respects the existing reduced-motion baseline. French/English use the shared locale provider and reviewed landing copy. No new animation, icon family or production service is introduced.
