# Sub-Agent Delegation Patterns

Reference for delegating work to specialized sub-agents.

## Agent Selection Matrix

| Situation | Agent | Why |
|-----------|-------|-----|
| Implement feature | **coder** | Clean context for focused implementation |
| Review implementation | **code-review** | Unbiased perspective |
| Tests failing mysteriously | **deep-dive** | Thorough investigation |
| Multiple approaches possible | **deep-dive** | Analysis of trade-offs |
| Security concern flagged | **deep-dive** | Security audit |
| Simple bug fix | **coder** | Quick targeted fix |
| Code style issues | (fix yourself) | Too simple for delegation |

## Prompt Structure

Every sub-agent prompt should include:

```
1. ROLE - What agent they're acting as
2. CONTEXT - Project background, tech stack
3. TASK - Specific work to do
4. REQUIREMENTS - Detailed specifications
5. KEY FILES - Where to look/modify
6. SUCCESS CRITERIA - How to know when done
```

## Coder Agent Prompts

### Feature Implementation

```
You are acting as the CODER agent.

## Project Context
[App name]. Tech stack: [languages/frameworks].
Key patterns: [reference existing files].

## Your Task
Implement feature [ID]: [name]

## Requirements
[Bullet list from features.json]

## Test Cases
[List test cases that must pass]

## Key Files
- [file]: [what to do with it]

## Success Criteria
- All test cases pass
- Code follows existing patterns
- No lint/type errors

Implement. Run tests. Summarize changes.
```

### Bug Fix

```
You are acting as the CODER agent.

## Project Context
[Brief context]

## Bug Description
[What's broken, error messages]

## Expected Behavior
[What should happen]

## Key Files
- [file]: [suspected location of bug]

## Success Criteria
- Bug is fixed
- No regressions (existing tests still pass)

Fix the bug. Run tests. Explain what you changed.
```

## Code-Review Agent Prompts

### Post-Implementation Review

```
You are acting as the CODE-REVIEW agent.

## What Was Implemented
[Summary from coder agent]

## Files Changed
- [file]: [brief description of changes]

## Feature Requirements
[Original requirements for context]

## Review Checklist
1. Run automated checks (lint, type-check)
2. Security review (input validation, auth)
3. Performance review (efficiency, queries)
4. Code quality (patterns, readability)

Report issues by severity: CRITICAL, HIGH, MEDIUM, LOW.
```

### Focused Security Review

```
You are acting as the CODE-REVIEW agent.

## Focus: Security Audit

## Code to Review
[Specific files or changes]

## Security Concerns
- [ ] Input validation
- [ ] SQL injection
- [ ] XSS prevention
- [ ] Auth/authz checks
- [ ] Sensitive data handling

Report ALL security issues, even potential ones.
```

## Deep-Dive Agent Prompts

### Bug Investigation

```
You are acting as the DEEP-DIVE agent.

## Problem
[Describe the bug/issue]

## What We've Tried
[List debugging attempts]

## Symptoms
- [Observable behavior 1]
- [Observable behavior 2]

## Hypotheses
1. [Possible cause 1]
2. [Possible cause 2]

## Investigate
Research this thoroughly. Check relevant files.
Search for similar issues online.
Report root cause and recommended fix.
```

### Architecture Decision

```
You are acting as the DEEP-DIVE agent.

## Decision Needed
[Describe the decision]

## Context
[Why this decision matters]

## Options Considered
1. [Option A]: [brief description]
2. [Option B]: [brief description]

## Constraints
- [Constraint 1]
- [Constraint 2]

## Investigate
Research best practices. Analyze trade-offs.
Consider long-term maintainability.
Provide recommendation with reasoning.
```

## Handling Sub-Agent Results

### Coder Agent Returns

Parse the summary for:
- Files created/modified
- Key implementation decisions
- Any concerns or TODOs

Pass this to code-review agent.

### Code-Review Agent Returns

Act based on severity:

```
CRITICAL/HIGH issues:
  → Spawn coder agent with fix requests
  → OR spawn deep-dive if root cause unclear

MEDIUM issues:
  → Fix yourself if simple
  → OR spawn coder for complex fixes

LOW issues:
  → Note for future improvement
  → Proceed with feature completion

No issues:
  → Proceed to test verification
```

### Deep-Dive Agent Returns

Apply recommendations:
- If fix identified → spawn coder to implement
- If architectural change → update progress.txt with decision
- If external blocker → document and skip feature

## Common Mistakes

❌ **Vague prompts**: "Implement the feature" without context
✅ **Specific prompts**: Include requirements, files, success criteria

❌ **Missing context**: Not passing progress.txt notes
✅ **Full context**: Include relevant history and decisions

❌ **Over-delegation**: Spawning deep-dive for simple bugs
✅ **Right-sizing**: Match agent to task complexity

❌ **Ignoring results**: Not processing sub-agent output
✅ **Acting on results**: Parse output, make decisions, proceed

## Delegation Flow Diagram

```
┌─────────────────┐
│ Select Feature  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Spawn Coder    │──────────────────┐
└────────┬────────┘                  │
         │                           │
         ▼                           │
┌─────────────────┐                  │
│ Spawn Code-Rev  │                  │
└────────┬────────┘                  │
         │                           │
         ▼                           │
    ┌────────────┐                   │
    │  Issues?   │                   │
    └─────┬──────┘                   │
          │                          │
    ┌─────┴─────┐                    │
    ▼           ▼                    │
 No Issues   Issues Found            │
    │           │                    │
    │      ┌────┴────┐               │
    │      │ Complex?│               │
    │      └────┬────┘               │
    │      ┌────┴────┐               │
    │      ▼         ▼               │
    │   Simple    Complex            │
    │   Fix self  Spawn Deep-Dive    │
    │      │         │               │
    │      │    ┌────┴────┐          │
    │      │    ▼         │          │
    │      │  Analysis    │          │
    │      │    │         │          │
    │      └────┼─────────┼──────────┘
    │           │         │    (back to coder)
    ▼           ▼         ▼
┌─────────────────────────────┐
│     Verify Tests Pass       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Update Progress + Commit  │
└─────────────────────────────┘
```
