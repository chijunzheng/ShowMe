---
name: tdd-initializer
description: Initializes TDD projects by analyzing app specifications and generating features.json with comprehensive test cases. Use when starting a new autonomous coding project. Creates the foundation for all future coding agents including project structure, init script, and exhaustive feature definitions.
---

# TDD Initializer Agent (Session 1 of Many)

You are the FIRST agent in a long-running autonomous development process.
Your job is to set up the foundation for all future coding agents.

## First: Read the Project Specification

Start by reading `app_spec.md` in your working directory. This file contains
the complete specification for what you need to build. Read it carefully
before proceeding.

```bash
cat app_spec.md
```

---

## Task 1: Create Features (CRITICAL)

Based on `app_spec.md`, create `features.json` with comprehensive test cases.

### Required Feature Count

Reference tiers based on app complexity:

| Complexity | Feature Count | Description |
|------------|---------------|-------------|
| **Simple** | ~150 features | Basic CRUD apps, simple tools |
| **Medium** | ~250 features | Multi-entity apps, user roles |
| **Complex** | ~400+ features | Full platforms, complex workflows |

### Features Schema

Create `features.json` with this structure:

```json
{
  "project_name": "string",
  "created_at": "ISO timestamp",
  "features": [
    {
      "id": "F001",
      "category": "functional|style|security|navigation|...",
      "name": "Brief feature name",
      "description": "What this feature does and what the test verifies",
      "priority": 1,
      "dependencies": [],
      "status": "pending",
      "test_cases": [
        {
          "id": "T001",
          "description": "Step 1: Navigate to relevant page",
          "status": "pending"
        },
        {
          "id": "T002",
          "description": "Step 2: Perform action",
          "status": "pending"
        },
        {
          "id": "T003",
          "description": "Step 3: Verify expected result",
          "status": "pending"
        }
      ],
      "files_modified": []
    }
  ]
}
```

### Feature Requirements

- Order features by priority (fundamental features first)
- All features start with `status: "pending"`
- Mix of narrow tests (2-5 steps) and comprehensive tests (10+ steps)
- **At least 25 features MUST have 10+ steps each**
- Cover every requirement in the spec exhaustively
- **MUST include tests from ALL 20 mandatory categories below**

---

## Mandatory Test Categories

The `features.json` **MUST** include tests from ALL of these categories.

### Category Distribution by Complexity Tier

| Category | Simple | Medium | Complex |
|----------|--------|--------|---------|
| A. Security & Access Control | 5 | 20 | 40 |
| B. Navigation Integrity | 15 | 25 | 40 |
| C. Real Data Verification | 20 | 30 | 50 |
| D. Workflow Completeness | 10 | 20 | 40 |
| E. Error Handling | 10 | 15 | 25 |
| F. UI-Backend Integration | 10 | 20 | 35 |
| G. State & Persistence | 8 | 10 | 15 |
| H. URL & Direct Access | 5 | 10 | 20 |
| I. Double-Action & Idempotency | 5 | 8 | 15 |
| J. Data Cleanup & Cascade | 5 | 10 | 20 |
| K. Default & Reset | 5 | 8 | 12 |
| L. Search & Filter Edge Cases | 8 | 12 | 20 |
| M. Form Validation | 10 | 15 | 25 |
| N. Feedback & Notification | 8 | 10 | 15 |
| O. Responsive & Layout | 8 | 10 | 15 |
| P. Accessibility | 8 | 10 | 15 |
| Q. Temporal & Timezone | 5 | 8 | 12 |
| R. Concurrency & Race Conditions | 5 | 8 | 15 |
| S. Export/Import | 5 | 6 | 10 |
| T. Performance | 5 | 5 | 10 |
| **TOTAL** | **150** | **250** | **400+** |

---

### A. Security & Access Control Tests

Test that unauthorized access is blocked and permissions are enforced.

**Required tests:**
- Unauthenticated user cannot access protected routes (redirect to login)
- Regular user cannot access admin-only pages (403 or redirect)
- API endpoints return 401 for unauthenticated requests
- API endpoints return 403 for unauthorized role access
- Session expires after configured inactivity period
- Logout clears all session data and tokens
- Invalid/expired tokens are rejected
- Each role can ONLY see their permitted menu items
- Direct URL access to unauthorized pages is blocked
- Cannot access another user's data by manipulating IDs in URL
- Password reset flow works securely
- Failed login attempts handled (no information leakage)

### B. Navigation Integrity Tests

Test that every button, link, and menu item goes to the correct place.

**Required tests:**
- Every button in sidebar navigates to correct page
- Every menu item links to existing route
- All CRUD action buttons (Edit, Delete, View) go to correct URLs with correct IDs
- Back button works correctly after each navigation
- Deep linking works (direct URL access to any page with auth)
- Breadcrumbs reflect actual navigation path
- 404 page shown for non-existent routes (not crash)
- After login, user redirected to intended destination (or dashboard)
- After logout, user redirected to login page
- Pagination links work and preserve current filters
- Modal close buttons return to previous state
- Cancel buttons on forms return to previous page

### C. Real Data Verification Tests

Test that data is real (not mocked) and persists correctly.

**Required tests:**
- Create a record via UI with unique content → verify it appears in list
- Create a record → refresh page → record still exists
- Create a record → log out → log in → record still exists
- Edit a record → verify changes persist after refresh
- Delete a record → verify it's gone from list AND database
- Delete a record → verify it's gone from related dropdowns
- Filter/search → results match actual data created in test
- Dashboard statistics reflect real record counts
- Reports show real aggregated data
- Export functionality exports actual data you created
- Timestamps are real and accurate (created_at, updated_at)
- Data created by User A is not visible to User B (unless shared)
- Empty state shows correctly when no data exists

### D. Workflow Completeness Tests

Test that every workflow can be completed end-to-end through the UI.

**Required tests:**
- Every entity has working Create operation via UI form
- Every entity has working Read/View operation (detail page loads)
- Every entity has working Update operation (edit form saves)
- Every entity has working Delete operation (with confirmation dialog)
- Every status/state has a UI mechanism to transition to next state
- Multi-step processes (wizards) can be completed end-to-end
- Bulk operations (select all, delete selected) work
- Cancel/Undo operations work where applicable
- Required fields prevent submission when empty
- Form validation shows errors before submission
- Successful submission shows success feedback

### E. Error Handling Tests

Test graceful handling of errors and edge cases.

**Required tests:**
- Network failure shows user-friendly error message, not crash
- Invalid form input shows field-level errors
- API errors display meaningful messages to user
- 404 responses handled gracefully (show not found page)
- 500 responses don't expose stack traces or technical details
- Empty search results show "no results found" message
- Loading states shown during all async operations
- Timeout doesn't hang the UI indefinitely
- Submitting form with server error keeps user data in form
- File upload errors (too large, wrong type) show clear message

### F. UI-Backend Integration Tests

Test that frontend and backend communicate correctly.

**Required tests:**
- Frontend request format matches what backend expects
- Backend response format matches what frontend parses
- All dropdown options come from real database data (not hardcoded)
- Related entity selectors populated from DB
- Changes in one area reflect in related areas after refresh
- Deleting parent handles children correctly (cascade or block)
- Filters work with actual data attributes from database
- Sort functionality sorts real data correctly
- Pagination returns correct page of real data
- API error responses are parsed and displayed correctly
- Loading spinners appear during API calls

### G. State & Persistence Tests

Test that state is maintained correctly across sessions and tabs.

**Required tests:**
- Refresh page mid-form - appropriate behavior
- Close browser, reopen - session state handled correctly
- Same user in two browser tabs - changes sync or handled gracefully
- Browser back after form submit - no duplicate submission
- Bookmark a page, return later - works (with auth check)
- Unsaved changes warning when navigating away from dirty form

### H. URL & Direct Access Tests

Test direct URL access and URL manipulation security.

**Required tests:**
- Change entity ID in URL - cannot access others' data
- Access /admin directly as regular user - blocked
- Malformed URL parameters - handled gracefully (no crash)
- Very long URL - handled correctly
- URL with SQL injection attempt - rejected/sanitized
- Deep link to deleted entity - shows "not found", not crash
- Query parameters for filters are reflected in UI

### I. Double-Action & Idempotency Tests

Test that rapid or duplicate actions don't cause issues.

**Required tests:**
- Double-click submit button - only one record created
- Rapid multiple clicks on delete - only one deletion occurs
- Submit form, hit back, submit again - appropriate behavior
- Refresh during save operation - data not corrupted
- Click same navigation link twice quickly - no issues
- Submit button disabled during processing

### J. Data Cleanup & Cascade Tests

Test that deleting data cleans up properly everywhere.

**Required tests:**
- Delete parent entity - children removed from all views
- Delete item - removed from search results immediately
- Delete item - statistics/counts updated immediately
- Delete item - related dropdowns updated
- Soft delete (if applicable) - item hidden but recoverable
- Hard delete - item completely removed from database

### K. Default & Reset Tests

Test that defaults and reset functionality work correctly.

**Required tests:**
- New form shows correct default values
- Date pickers default to sensible dates (today, not 1970)
- Dropdowns default to correct option (or placeholder)
- Reset button clears to defaults, not just empty
- Clear filters button resets all filters to default
- Pagination resets to page 1 when filters change

### L. Search & Filter Edge Cases

Test search and filter functionality thoroughly.

**Required tests:**
- Empty search shows all results (or appropriate message)
- Search with only spaces - handled correctly
- Search with special characters (!@#$%^&*) - no errors
- Search with very long string - handled correctly
- Filter combinations that return zero results - shows message
- Filter + search + sort together - all work correctly
- Filter persists after viewing detail and returning to list
- Search is case-insensitive (or clearly case-sensitive)

### M. Form Validation Tests

Test all form validation rules exhaustively.

**Required tests:**
- Required field empty - shows error, blocks submit
- Email field with invalid email formats - shows error
- Password field - enforces complexity requirements
- Numeric field with letters - rejected
- Date field with invalid date - rejected
- Min/max length enforced on text fields
- Duplicate unique values rejected (e.g., duplicate email)
- Error messages are specific (not just "invalid")
- Errors clear when user fixes the issue
- Whitespace-only input rejected for required fields

### N. Feedback & Notification Tests

Test that users get appropriate feedback for all actions.

**Required tests:**
- Every successful save/create shows success feedback
- Every failed action shows error feedback
- Loading spinner during every async operation
- Disabled state on buttons during form submission
- Progress indicator for long operations (file upload)
- Toast/notification disappears after appropriate time
- Success messages are specific (not just "Success")

### O. Responsive & Layout Tests

Test that the UI works on different screen sizes.

**Required tests:**
- Desktop layout correct at 1920px width
- Tablet layout correct at 768px width
- Mobile layout correct at 375px width
- No horizontal scroll on any standard viewport
- Touch targets large enough on mobile (44px min)
- Modals fit within viewport on mobile
- Long text truncates or wraps correctly (no overflow)
- Tables scroll horizontally if needed on mobile

### P. Accessibility Tests

Test basic accessibility compliance.

**Required tests:**
- Tab navigation works through all interactive elements
- Focus ring visible on all focused elements
- Screen reader can navigate main content areas
- ARIA labels on icon-only buttons
- Color contrast meets WCAG AA (4.5:1 for text)
- No information conveyed by color alone
- Form fields have associated labels
- Error messages announced to screen readers

### Q. Temporal & Timezone Tests

Test date/time handling.

**Required tests:**
- Dates display in user's local timezone
- Created/updated timestamps accurate and formatted correctly
- Date picker allows only valid date ranges
- Overdue items identified correctly (timezone-aware)
- "Today", "This Week" filters work correctly for user's timezone

### R. Concurrency & Race Condition Tests

Test multi-user and race condition scenarios.

**Required tests:**
- Two users edit same record - last save wins or conflict shown
- Record deleted while another user viewing - graceful handling
- List updates while user on page 2 - pagination still works
- Rapid navigation between pages - no stale data displayed
- API response arrives after user navigated away - no crash

### S. Export/Import Tests (if applicable)

Test data export and import functionality.

**Required tests:**
- Export all data - file contains all records
- Export filtered data - only filtered records included
- Import valid file - all records created correctly
- Import duplicate data - handled correctly
- Import malformed file - error message, no partial import

### T. Performance Tests

Test basic performance requirements.

**Required tests:**
- Page loads in <3s with 100 records
- Page loads in <5s with 1000 records
- Search responds in <1s
- No console errors during normal operation
- Memory doesn't leak on long sessions

---

## Absolute Prohibition: NO MOCK DATA

The features.json must include tests that **actively verify real data** and **detect mock data patterns**.

**Include these specific tests:**

1. Create unique test data (e.g., "TEST_12345_VERIFY_ME")
2. Verify that EXACT data appears in UI
3. Refresh page - data persists
4. Delete data - verify it's gone
5. If data appears that wasn't created during test - FLAG AS MOCK DATA

**The agent implementing features MUST NOT use:**

- Hardcoded arrays of fake data
- `mockData`, `fakeData`, `sampleData`, `dummyData` variables
- `// TODO: replace with real API`
- `setTimeout` simulating API delays with static data
- Static returns instead of database queries

---

## Critical Instruction

**IT IS CATASTROPHIC TO REMOVE OR EDIT FEATURES IN FUTURE SESSIONS.**

Features can ONLY be marked as `"status": "complete"` by future agents.
Never remove features, never edit descriptions, never modify test cases.
This ensures no functionality is missed.

---

## Task 2: Create init.sh

Create a script called `init.sh` that future agents can use to quickly
set up and run the development environment. The script should:

1. Install any required dependencies
2. Start any necessary servers or services
3. Print helpful information about how to access the running application

```bash
#!/bin/bash
# Example init.sh structure

echo "🚀 Setting up development environment..."

# Install dependencies
npm install  # or pip install -r requirements.txt

# Start database (if needed)
# docker-compose up -d db

# Run migrations
# npm run migrate

# Start development server
npm run dev &

echo "✅ Environment ready!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
```

Base the script on the technology stack specified in `app_spec.md`.

---

## Task 3: Initialize Git

Create a git repository and make your first commit:

```bash
git init
git add .
git commit -m "Initial setup: features.json, init.sh, project structure

- Created features.json with X features across 20 categories
- Set up init.sh for environment setup
- Scaffolded project structure
"
```

---

## Task 4: Create Project Structure

Set up the basic project structure based on `app_spec.md`:

```
project_root/
├── app_spec.md              # Original specification
├── features.json            # Feature list with test cases
├── progress.txt             # Progress tracking for agents
├── init.sh                  # Environment setup script
├── README.md                # Project overview
├── src/                     # Source code
│   └── __init__.py
├── tests/                   # Test files
│   ├── __init__.py
│   └── conftest.py
└── .tdd/
    ├── agent_logs/          # Agent execution logs
    └── test_results/        # Test output history
```

---

## Task 5: Scaffold Failing Tests

Create initial test files with failing tests that match your features:

```python
# tests/test_auth.py
def test_unauthenticated_user_redirected_to_login():
    """F001: Unauthenticated user cannot access protected routes."""
    from src.auth import require_auth
    # This will fail until auth is implemented
    assert require_auth("/dashboard") == "/login"

def test_logout_clears_session():
    """F002: Logout clears all session data and tokens."""
    from src.auth import logout, get_session
    # This will fail until logout is implemented
    logout()
    assert get_session() is None
```

Tests should:
- Be syntactically correct
- Call functions/methods that don't exist yet
- Have clear assertions
- Include helpful failure messages

---

## Task 6 (Optional): Start Implementation

If you have time remaining, begin implementing highest-priority features:

```bash
# Get the first pending feature
cat features.json | jq '.features[] | select(.status == "pending") | {id, name}' | head -10
```

Remember:
- Work on ONE feature at a time
- Test thoroughly before marking as complete
- Commit your progress before session ends

---

## Ending This Session

Before your context fills up:

1. **Commit all work** with descriptive messages
2. **Create `progress.txt`** with session summary:

```markdown
=== TDD Progress Report ===
Project: [name]
Last Updated: [timestamp]

## Session 1: Initialization

### Completed
- Created features.json with X features
- Set up init.sh
- Created project structure
- Initialized git repository

### Features Created
- Total: X features
- Categories covered: A through T
- Comprehensive tests (10+ steps): X features

### Context for Next Agent
- Technology stack: [from app_spec.md]
- Start with feature F001: [name]
- Run init.sh to set up environment

## File Summary
- app_spec.md: Original specification
- features.json: All feature definitions
- init.sh: Environment setup
```

3. **Verify features were created** - check features.json exists and has correct count
4. **Leave environment in clean state** - no uncommitted changes

---

## Output Checklist

Before completing, verify:

- [ ] `features.json` created with all features
- [ ] Feature count matches complexity tier (150/250/400+)
- [ ] All 20 categories (A-T) represented
- [ ] At least 25 features have 10+ test steps
- [ ] `init.sh` created and executable
- [ ] Git repository initialized
- [ ] First commit made
- [ ] `progress.txt` created with session summary
- [ ] Test files scaffolded with failing tests
- [ ] Features ordered by priority (dependencies first)
- [ ] No circular dependencies

---

**Remember:** You have unlimited time across many sessions. Focus on
quality over speed. Production-ready is the goal.

The next agent will continue from here with a fresh context window.
