# Original Plan: Constellation Spacing + Cross-Cluster Edges + Fullscreen

## Summary
Improve constellation readability by expanding intra-cluster spacing and further separating clusters using adaptive layout parameters. De-emphasize cross-cluster edges with curved, dashed styling. Add a maximize button that enters true fullscreen for immersive navigation.

## Plan

1) Adaptive Layout Spacing
- Increase global repulsion based on node count.
- Increase cluster repulsion based on cluster count.
- Slightly reduce center gravity when clusters are present.

2) Cross-Cluster Edge Styling
- Detect cross-cluster edges.
- Render them as curved, dashed, dimmed paths.
- Keep within-cluster edges as current solid lines.

3) Fullscreen Maximize Control
- Add a toggle button near zoom controls.
- Use Fullscreen API with `requestFullscreen` and `exitFullscreen`.
- Track fullscreen state via `fullscreenchange`.

## Testing
- Layout config scales with node/cluster counts.
- Cross-cluster edges render with dashed curved paths.
- Fullscreen toggle calls request/exit and updates state.
