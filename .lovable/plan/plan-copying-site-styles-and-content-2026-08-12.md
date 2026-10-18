# Plan - Copying Site Styles and Content

The user wants to replicate the visual style (blue color scheme) and specific content (Privacy Policy, Exchange/Transfer Policy, and events) from `buyticketbrasil.com`.

## User-facing changes
- **Visual Refresh**: Update the global color palette to match the blue theme of the reference site.
- **New Content**:
    - Add a "Privacy Policy" page.
    - Add an "Exchange and Ticket Transfer Policy" page.
- **Demo Events**: Seed the database with sample events inspired by the reference site (e.g., Brazilian music shows, local festivals).

## Technical details
- **Styling**: Update `src/styles.css` with a new `oklch` based blue color palette.
- **Routes**:
    - Create `src/routes/politica-de-privacidade.tsx`.
    - Create `src/routes/politica-de-troca-e-transferencia.tsx`.
- **Database**: Add a new SQL migration to seed `events`, `organizers`, and `ticket_tiers` with sample data.
- **Footer**: Update `src/components/site-footer.tsx` to link to the new policy pages.

## Contextual Notes
- I will use the Lovable AI Gateway to generate high-quality placeholder text for the policies and realistic event descriptions if needed.
- The blue theme will replace the current "magenta/gold" theme in `src/styles.css`.
