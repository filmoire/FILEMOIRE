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

The signature is generous cream paper, plum typography, lilac illustration panels and fine dividing rules. Avoid generic analytics cards, gradients, heavy shadows and invented sample activity. Public marketing and printed book typography retain their existing identity.

## Colors

Runtime ownership is model B: `src/app/dashboard.css` owns the six `--dash-*` tokens above. Its scoped dashboard recipes consume them directly. This file mirrors those values; `tailwind.config.ts` remains the owner of existing public/book and semantic error/success tokens. Focus uses accent; selection and empty panels use wash. Light theme only; forced colors remain operable.

## Typography

Trebuchet MS with sans-serif fallback for headings, navigation, controls and tables; Georgia with serif fallback for prose. Headings are regular weight, with a 48px desktop page title and 38px mobile title. Reference fonts are system fonts and need no paid service or network fetch. Saved stories and book previews preserve their own book typography.

## Layout

1200px content at a 1440px viewport; fluid gutters below 1280px. Two-line header: identity then role-specific navigation. Main content has 48px top padding and natural document scrolling. Buyer home uses a 1.9:1 split with 42px gap. At 800px the columns stack, navigation wraps and images move above empty-state copy. Tables own horizontal overflow and remain semantic tables.

## Elevation & Depth

Static content is flat. Use borders for rows and lilac for summaries. Dialogs alone use existing modal overlay and elevation. Images reserve their dimensions.

## Shapes

30px pill controls, 32px illustration panels, 16px notices, and thin dividers. Existing narrator editing cards receive the shared surface treatment without changing book page composition.

## Components

`LiveShell` owns header, role navigation, locale switch, identity and footer. Shared `Button`, `Input`, `Textarea`, `Select`, `Dialog` remain canonical. `dashboard-ui.tsx` owns repeated page introductions, empty panels, status badges and pagination. Enabled controls have hover, active and keyboard focus; disabled controls remain explained and cannot activate. Loading/error states are persistent text with retry; mutations only claim success after the server acknowledges them.

## Do's and Don'ts

- Use actual accessible account data and server counts. Never copy mock names, dates, totals or shipping references into live screens.
- Preserve narrator authority, MFA, scoped support grants, immutable approved PDFs and unsaved recording protection.
- Translate interface copy, never a person's name, narrative, caption or cover title.
- Keep safe primary actions separate from refunds, deletion and access revocation.

## Designer completion — 26 October 2026

The seven-step gift flow preserves the supplied first-step composition and extends it with the same typography, controls and lilac summary. Shared books use the illustrated home empty state and a plain empty panel on the books tab. Support uses full-width ruled rows. Question groups follow chapter order with compact metadata tags and canonical activation switches. Orders and projects use operational metadata columns from the reference. The added language, account, refresh and protected operational controls remain available for a working application.
