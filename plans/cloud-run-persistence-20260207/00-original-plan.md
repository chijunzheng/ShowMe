# Cloud Run Readiness Plan: Durable Constellation + 3 Mode Persistence

## Summary
Deploy a single Cloud Run app where frontend + backend run same-origin, and move persistence from browser-local to cloud for:
1. Constellation graph
2. Slides/topic versions
3. Game mode data (Mystery, Wonder, Story)

This plan keeps anonymous users, stores completed mode runs, adds one-time local-data import, and avoids changing living-world paths.

## Public API / Interface Changes
1. Add graph state endpoints in `backend/src/routes/graph.js`.
   - `POST /api/graph/state/load` with `{ clientId }`
   - `POST /api/graph/state/save` with `{ clientId, graph }`

2. Add mode session endpoints in new route `backend/src/routes/modes.js`.
   - `POST /api/modes/save`
   - `POST /api/modes/latest`
   - `POST /api/modes/list`

3. Add migration endpoint in new route `backend/src/routes/migration.js`.
   - `POST /api/migration/import-local` with
     `{ clientId, topics, graph, stories, migrationVersion, checksum }`
   - idempotent behavior.

4. Expand frontend completion payload contract for Mystery/Wonder.
   - `onComplete` payload includes a `session` object (completed-only snapshot)

5. Keep Story API paths, but change backend storage implementation.
   - `/api/stories` remains.
   - Storage moves to scalable Firestore docs + GCS-backed image paths.

## Implementation Plan
1. Create execution artifacts before coding.
2. Unify client identity across app.
3. Fix production API base behavior for Cloud Run.
4. Add graph persistence service.
5. Wire graph persistence in frontend hook.
6. Add durable mode-session storage.
7. Upgrade story persistence to true cloud-first.
8. Add one-time local import flow.
9. Keep Cloud Run deployment path and validate IAM/env.
10. Verification and quality gate.

## Test Cases and Scenarios
1. API base correctness in production build.
2. Graph persistence round-trip.
3. Mystery/Wonder completed-run persistence.
4. Story persistence round-trip.
5. One-time import idempotency.
6. Cloud Run smoke test for judge path.

## Assumptions and Defaults
1. Mode persistence depth is completed runs only.
2. Judge uses their own anonymous session data (no shared demo account).
3. Include one-time migration from existing local browser data into cloud.
4. `livingWorldStore` is out of scope.
