# Code Review Checklist

Quick reference for systematic code review.

## Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| CRITICAL | Security vulnerabilities, data loss risks, crashes | Must fix before merge |
| HIGH | Performance issues, maintainability debt, bugs | Should fix before merge |
| MEDIUM | Code quality, readability concerns | Recommended to fix |
| LOW | Style, documentation, minor improvements | Nice to have |

## Security Checklist

- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Input validation at all entry points
- [ ] SQL queries use parameterized statements
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection on state-changing operations
- [ ] Authentication/authorization checks present
- [ ] Error messages don't leak sensitive info
- [ ] Sensitive data not logged

## Performance Checklist

- [ ] No N+1 query patterns
- [ ] Appropriate data structures used
- [ ] No unnecessary loops or iterations
- [ ] Large datasets paginated
- [ ] Resources properly closed (files, connections)
- [ ] No memory leaks (circular references, event listeners)
- [ ] Caching considered where beneficial

## Code Quality Checklist

- [ ] Functions have single responsibility
- [ ] Variable/function names are descriptive
- [ ] No magic numbers (use named constants)
- [ ] DRY - no unnecessary duplication
- [ ] Error cases handled explicitly
- [ ] Complex logic has explanatory comments
- [ ] Consistent code style

## Testing Checklist

- [ ] Code is testable (dependencies injectable)
- [ ] Edge cases considered
- [ ] Error paths tested
- [ ] No test code in production

## Automated Checks to Run

```bash
# JavaScript/TypeScript
npm run lint
npm run type-check
npx prettier --check .

# Python
ruff check .
mypy .
black --check .

# Go
go vet ./...
golint ./...
go fmt ./...
```

## Common Issues by Language

### JavaScript/TypeScript
- Missing `await` on async functions
- Loose equality (`==` instead of `===`)
- Missing error boundaries in React
- Unhandled promise rejections

### Python
- Mutable default arguments
- Missing `self` in methods
- Bare `except:` clauses
- Not closing file handles

### Go
- Ignored errors (`_ = someFunc()`)
- Missing mutex locks
- Goroutine leaks
- Nil pointer dereference

## Output Template

```markdown
## Automated Checks Results
- Lint: [PASS/FAIL] - [N issues]
- Type Check: [PASS/FAIL] - [N errors]
- Format: [PASS/FAIL]

## Code Review Summary
- Total Issues: N
- Critical: N | High: N | Medium: N | Low: N

## Critical Issues
1. **[File:Line]** - [Description]
   - Problem: [What's wrong]
   - Fix: [How to fix]

## High Priority Issues
...

## Positive Observations
- [What was done well]

## Recommendations
- [Suggested improvements]
```
