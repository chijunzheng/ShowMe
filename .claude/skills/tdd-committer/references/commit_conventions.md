# Commit Message Conventions

## Conventional Commits Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

## Types

| Type | Description |
|------|-------------|
| `feat` | New feature for the user |
| `fix` | Bug fix for the user |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `refactor` | Refactoring production code |
| `test` | Adding or fixing tests (no production code change) |
| `chore` | Updating build tasks, configs, etc. (no production code) |

## Scope

The scope should indicate what is affected:

- `auth` - Authentication/authorization
- `api` - API endpoints
- `db` - Database/models
- `ui` - User interface
- `core` - Core business logic
- `config` - Configuration
- `deps` - Dependencies

## Subject Rules

1. Use imperative mood: "add feature" not "added feature"
2. Don't capitalize first letter
3. No period at end
4. Max 50 characters

### Good Examples
- `feat(auth): add JWT token refresh`
- `fix(api): handle empty request body`
- `test(user): add validation tests`

### Bad Examples
- `feat(auth): Added JWT token refresh.` (past tense, period)
- `FEAT(AUTH): ADD JWT TOKEN REFRESH` (all caps)
- `added jwt refresh` (no type/scope)

## Body

- Wrap at 72 characters
- Explain WHAT and WHY, not HOW
- Separate from subject with blank line

```
feat(api): add rate limiting to endpoints

Prevent abuse by limiting requests to 100/minute per user.
This addresses production issues with bot traffic.

Uses token bucket algorithm for smooth limiting.
```

## Footer

Reference issues and features:

```
Implements: F001
Tests: 5/5 passed
Depends-on: F002, F003
Closes: #123
```

## TDD-Specific Footer Fields

| Field | Purpose |
|-------|---------|
| `Implements:` | Feature ID from features.json |
| `Tests:` | Test pass count (e.g., "5/5 passed") |
| `Depends-on:` | Prerequisite feature IDs |
| `Retry:` | Attempt number if feature required retries |

## Multi-line Commit Example

```
feat(auth): implement user authentication

Add complete authentication system with:
- User registration with email verification
- Login with JWT tokens (1-hour expiry)
- Refresh token rotation
- Logout with token invalidation

Security considerations:
- Passwords hashed with bcrypt (cost=12)
- Tokens stored in httpOnly cookies
- Rate limiting on login attempts

Implements: F001
Tests: 8/8 passed
```

## Commit Message Template

Save as `.gitmessage` and configure:

```bash
git config commit.template .gitmessage
```

Template content:
```
# <type>(<scope>): <subject>
# |<----  Using a Maximum Of 50 Characters  ---->|


# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|


# Provide links or keys to any relevant tickets, articles, etc.
# Implements: FXXX
# Tests: X/X passed

# --- COMMIT END ---
# Type can be:
#    feat     (new feature)
#    fix      (bug fix)
#    refactor (refactoring code)
#    style    (formatting, no code change)
#    docs     (changes to documentation)
#    test     (adding or refactoring tests)
#    chore    (updating build tasks, configs, etc)
```
