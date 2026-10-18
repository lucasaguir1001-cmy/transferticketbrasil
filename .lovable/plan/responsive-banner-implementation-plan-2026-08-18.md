# Responsive Banner Implementation Plan

Update the hero banner system to support responsive image switching and typography.

## User Review Required

> [!IMPORTANT]
> To fully implement this, we need vertical versions (9:16 or 4:5) for each banner: BTS, F1, Iron Maiden, and Ed Sheeran. I will set up the structure using current images, but you'll need to provide vertical assets for the best mobile result.

## Proposed Changes

### Assets & Configuration
- Update `slides` array in `src/routes/index.tsx` to support both `desktop` and `mobile` image URLs.
- Map existing assets to both fields initially.

### Frontend Implementation
- **Responsive Images**: Use `<picture>` with `<source media="(max-width: 768px)">` to swap between mobile (vertical) and desktop (horizontal) images.
- **Fixed Proportions**: 
  - Desktop: Maintain 16:9 ratio where possible using `object-cover`.
  - Mobile: Set a fixed height (`min-h-[70vh]`) to ensure visibility and prevent distortion.
- **Responsive Typography**: Replace fixed tailwind text sizes with `clamp()` or `vw` units for heading and description to ensure legibility across all screen sizes.
- **Background Optimization**: Apply `object-center` and `object-cover` to keep the focus on the artist.
- **Performance**: Enable `loading="eager"` for the first slide and `lazy` for others.

### Refinement
- Adjust hero container padding and alignment to ensure content stays visible "above the fold" on mobile.

## Technical Details
- **Breakpoints**: 768px (Mobile/Tablet transition).
- **CSS Units**: Using Tailwind's arbitrary value syntax for `clamp()` (e.g., `text-[clamp(1.5rem,3vw,2.5rem)]`).
- **Aspect Ratio**: Handled via `min-h-[70vh]` on the container and `h-full w-full object-cover` on the images.
