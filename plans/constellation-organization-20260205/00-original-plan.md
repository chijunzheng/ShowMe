# Original Plan: Constellation Organization Fixes

## Summary
Ensure suggested topics always connect to existing nodes by enforcing valid `connectsTo` mapping and strict AI retries. Keep categories updated by auto reclustering on each new topic (with small-graph guard + debounce). Maintain minimal category labels with stronger halos for grouping.

## Plan

1) Gap Link Reliability (AI Retry Only)
- Prompt requires valid `connectsTo` from existing topics list.
- Retry if any gap fails to map to valid node IDs.
- Return only gaps with at least one connection.

2) Auto Reclustering
- Recluster on each new topic while graph is small.
- Debounce to avoid thrashing.
- Skip auto recluster on large graphs.

3) Category Label/Cluster Halo Behavior
- Keep minimal labels (>=2 nodes, hide General).
- Slightly emphasize halos to show grouping.

## Testing
- Backend test for retry when any gap has empty connects.
- Frontend tests for filtering invalid gaps + recluster decision helper.
