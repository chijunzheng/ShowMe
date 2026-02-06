# Feature: Visual Polish (Background Stars + Cluster Labels + Star Brightness)

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Make the constellation look and feel like a real night sky: visible twinkling background stars, subtle cluster labels that don't overlap, and star brightness that varies with mastery.

## Acceptance Criteria

- [ ] Background has ~50 visible stars with subtle twinkling animation
- [ ] Cluster labels don't overlap topic stars (positioned well above)
- [ ] Cluster labels are subtle text (no pill background)
- [ ] Star colors change from grey (dim) to white (brilliant) based on mastery
- [ ] Star glow effects match their color
- [ ] Build passes

## Implementation Details

### Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx`
- `frontend/src/components/Constellation/ConstellationCluster.jsx`
- `frontend/src/components/Constellation/ConstellationStar.jsx`

### Constellation.jsx — Background stars (Issue 2)

**Lines 253-287:** Replace the 20-dot starfield array with ~50 entries:
- Size range: 1–3px (was 1–2px), include a few 4px "bright" dots
- Opacity range: 0.15–0.5 (was 0.15–0.35)
- Add twinkling to ~30% of dots (every 3rd):
  - Use inline `animation` style: `'twinkle 4s ease-in-out infinite'` with varying delays
- Add a `<style>` tag inside the component (or inline keyframes) for `@keyframes twinkle`:
  ```css
  @keyframes twinkle {
    0%, 100% { opacity: var(--base-opacity); }
    50% { opacity: calc(var(--base-opacity) * 0.3); }
  }
  ```
  Simplest approach: use inline animation style per dot with randomized durations (3-6s)

### ConstellationCluster.jsx — Cluster label overlap (Issue 3)

**Label positioning:**
- Change offset: `minY - 30` → `minY - 55` (more clearance above topmost star)

**Label styling — make subtle, remove pill:**
- Remove `rounded-full` and `px-3 py-1` from inner div className
- Remove `backgroundColor` from style (no pill background)
- Change `text-sm` → `text-[11px]`
- Change `opacity-60` → `opacity-40`
- Keep `textShadow` for readability
- Keep `color: cluster.color || '#9CA3AF'`

### ConstellationStar.jsx — Star brightness by mastery (Issue 5)

**Add new COLOR_CLASSES constant:**
```js
const COLOR_CLASSES = {
  dim: 'bg-slate-500',
  glow: 'bg-indigo-300',
  bright: 'bg-indigo-200',
  brilliant: 'bg-white',
}
```

**Update GLOW_CLASSES shadows to match colors:**
- `dim`: `opacity-60 shadow-[0_0_4px_rgba(100,116,139,0.3)]`
- `glow`: `opacity-80 shadow-[0_0_8px_rgba(165,180,252,0.5)]`
- `bright`: `opacity-95 shadow-[0_0_14px_rgba(199,210,254,0.7)]`
- `brilliant`: `opacity-100 shadow-[0_0_24px_rgba(255,255,255,0.9)] animate-pulse-slow`

**In the button element:**
- Replace hardcoded `bg-indigo-400` with `${colorClass}` (looked up from COLOR_CLASSES)
- Add: `const colorClass = COLOR_CLASSES[node.brightness] || COLOR_CLASSES.glow`

**Update brilliant ray gradient:**
- Change `from-indigo-400` → `from-white/60` in the ray div className

## Implementation Checklist

- [ ] Edit Constellation.jsx — enhance background starfield
- [ ] Edit ConstellationCluster.jsx — subtle labels, more offset
- [ ] Edit ConstellationStar.jsx — mastery-based colors + glows
- [ ] Verify build

---

**Created:** 2026-02-05
