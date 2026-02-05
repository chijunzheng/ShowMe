# Feature: Backend — Learn JSON body limit (2mb)

**ID:** 01  
**Status:** ✅ Completed  
**Priority:** High  
**Estimated Complexity:** Low  
**Dependencies:** -

## Description

Allow larger JSON bodies for `/api/learn/*` requests (2mb) while keeping the existing small-by-default limit (10kb) for other `/api/*` routes (except existing large routes like `/api/slides*` and `/api/world/piece*`).

## Acceptance Criteria

- [ ] Requests to `/api/learn/*` with JSON bodies larger than 10kb succeed (body parsed and route handler receives `req.body`).
- [ ] Requests to other `/api/*` routes still enforce the existing 10kb limit (return 413 when exceeded).
- [ ] Existing large routes keep their current larger limit (20mb for `/api/slides*` and `/api/world/piece*`).

## Implementation Details

### Files to Create/Modify

- `backend/src/middleware/jsonBodyParser.js` — exports the route-aware JSON parsing middleware.
- `backend/src/index.js` — uses the new middleware.

### Key Components

1. `createJsonBodyParserMiddleware()`
   - Chooses parser by `req.path` prefix:
     - `/api/slides*` or `/api/world/piece*` → `express.json({ limit: '20mb' })`
     - `/api/learn*` → `express.json({ limit: '2mb' })`
     - everything else → `express.json({ limit: '10kb' })`

### Technical Decisions

- **Decision:** Keep strict default (10kb) and only relax `/api/learn/*` to 2mb.
- **Trade-off:** 2mb is generous for text slides but still guards against accidental base64 payloads.

## Testing Requirements

- [ ] Covered by Feature 02 integration-style test using Express + Supertest.

## Security Considerations

- [ ] Maintain small-by-default parsing to limit attack surface.
- [ ] Keep explicit route allowlist for larger bodies.

## Implementation Checklist

- [ ] Create `backend/src/middleware/jsonBodyParser.js`
- [ ] Update `backend/src/index.js` to use it
- [ ] Run `cd backend && npm test`

---
**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** Codex CLI
