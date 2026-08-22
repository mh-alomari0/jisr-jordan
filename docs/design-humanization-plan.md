# JISR Design Humanization Plan

Goal: keep the current JISR visual identity and make the product feel intentionally designed, maintained, and tested by a real product team rather than generated from a single visual prompt.

## Non-negotiables

- Keep the current teal / sand / peach visual identity.
- Keep Cairo and RTL-first layouts.
- Keep the existing JISR mark and overall brand direction.
- Do not redesign pages just for novelty.
- Prefer product-specific patterns over generic SaaS cards.
- Every visual change must preserve function, accessibility, and responsive behavior.

## What makes the current UI feel generated

1. Too many repeated rounded cards, pills, gradients, and hover lifts with the same visual rhythm.
2. Some decorative motion is present even when it communicates no state.
3. Several sections use polished marketing copy where short product language would feel more natural.
4. Desktop patterns are sometimes scaled down rather than intentionally adapted for mobile.
5. A few UI indicators are decorative instead of data-driven.
6. Component polish is uneven: strong hero and brand work, but some utility screens and edge states feel generic.

## Humanization rules

### Typography
- Use short, conversational Arabic.
- Prefer clear product verbs: دور، احكي، احجز، قارن، تابع.
- Avoid repeating the same slogan structure across unrelated pages.
- Keep headings visually strong but not every label bold-black.

### Shape language
- Preserve large rounded surfaces for signature JISR sections.
- Use smaller radii for utility controls and dense product surfaces.
- Do not put every label inside a pill.
- Reserve full pill treatment for statuses, filters, and compact actions.

### Motion
- Motion must communicate state or hierarchy.
- Remove perpetual/pulsing decoration unless something is genuinely new or live.
- Prefer 120–200ms control feedback and 200–300ms section transitions.
- Respect reduced-motion preferences.

### Mobile
- Treat mobile as its own composition, not a compressed desktop page.
- All overlays must fit safe areas and never create horizontal overflow.
- Bottom navigation must be stable, thumb-friendly, and visually quiet.
- Avoid floating elements that cover content without a clear reason.

### Cards
- Listing, provider, booking, and message cards should not all share one identical template.
- Give each domain a useful information hierarchy.
- Decorative icons are secondary to real data.

### States
Every important surface must have intentional:
- loading
- empty
- error
- disabled
- long-content
- missing-image
- offline / retry where relevant

## Rollout order

### Phase 1 — Foundation
- globals / shared tokens
- navbar
- mobile bottom nav
- footer
- notification overlays
- common buttons and form behavior

### Phase 2 — Marketplace
- home
- discover
- service type pages
- listing cards / listing details
- provider cards / provider profiles

### Phase 3 — Customer product
- booking flow
- bookings list / detail
- messages
- notifications
- favorites
- profile

### Phase 4 — Provider product
- provider dashboard
- listings
- bookings
- quotes
- profile
- schedule

### Phase 5 — Admin
- navigation / information density
- tables and filters
- dashboard hierarchy
- moderation screens
- empty/error/loading states

### Phase 6 — Auth and trust
- login / register
- OTP / forgot password
- account deletion / logout
- policy and trust messaging

## Current first-pass changes

- Mobile bottom navigation interaction and badge presentation cleaned up.
- Invalid utility class in message badge positioning removed.
- Unnecessary pulsing badge animation removed from the nav to make the surface calmer.
- Footer unused import removed and utility ordering normalized.

## Definition of done

JISR should feel like one product with a consistent voice and intentional behavior, while individual areas still have their own hierarchy. A user should not notice a design system; they should simply feel that everything belongs together and works naturally.
