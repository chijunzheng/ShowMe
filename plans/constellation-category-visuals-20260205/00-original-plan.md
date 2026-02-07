# Original Plan: Category Visualization (Minimal Labels + Glow + Hover + Legend)

## Summary
Reduce clutter by hiding category names by default, using soft region glows for grouping, revealing category labels on hover, and adding a small optional legend to explain colors.

## Plan

1) Hide default category labels
- Only show a single category label when hovering/focusing a node.

2) Strengthen region glow
- Increase halo radius and opacity slightly for better grouping visibility.
- Boost glow for the active category on hover.

3) Legend toggle
- Add a small toggle to show/hide category legend.
- Hovering a legend item highlights that category’s nodes.

## Update (2026-02-05)
- Remove category names from the map entirely (color-only grouping on the canvas).
- Keep category identity in the legend, positioned top-left for easy lookup.
- Use legend hover/focus to highlight a category and dim others.

## Update (2026-02-05) - Declutter Pass
- Simplify all regular edges to a single muted style.
- Keep dashed lines only for suggested topics (gaps).
- Increase cluster spacing and reduce center gravity to open up the middle.
- Make the category legend collapsible as the list grows.

## Testing
- Labels are hidden by default.
- Label appears on hover/focus.
- Legend opens/closes and highlights cluster nodes.
