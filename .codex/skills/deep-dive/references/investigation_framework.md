# Investigation Framework Reference

Systematic approach to technical deep dives.

## Investigation Types

| Type | Goal | Key Focus |
|------|------|-----------|
| Bug Investigation | Find root cause | Code paths, state changes, timing |
| Architecture Review | Understand system | Components, data flow, dependencies |
| Performance Analysis | Identify bottlenecks | Metrics, profiling, hotspots |
| Security Audit | Find vulnerabilities | Attack vectors, data handling |
| Plan Review | Validate approach | Risks, alternatives, feasibility |
| Codebase Exploration | Map understanding | Structure, patterns, key files |

## Phase 1: Scope Definition

Questions to answer:
- What exactly is being investigated?
- What does success look like?
- What is out of scope?
- What constraints exist (time, access, etc.)?

Template:
```markdown
## Investigation Scope
- **Objective**: [Primary goal]
- **Success Criteria**: [What determines completion]
- **Boundaries**: [What's included/excluded]
- **Constraints**: [Limitations to work within]
```

## Phase 2: Information Gathering

### Codebase Exploration
```bash
# Find entry points
grep -r "main\|app\|server" --include="*.py" --include="*.js"

# Map directory structure
find . -type f -name "*.py" | head -50

# Find configuration
find . -name "*.json" -o -name "*.yaml" -o -name "*.toml" | head -20

# Identify key files
ls -la src/ lib/ app/ 2>/dev/null
```

### Code Search Patterns
```bash
# Find function definitions
grep -r "def function_name\|function function_name" .

# Find class definitions
grep -r "class ClassName" .

# Find usages
grep -r "function_name\|ClassName" . --include="*.py"

# Find error handling
grep -r "try:\|catch\|except" . --include="*.py" --include="*.js"
```

### External Research

Research queries to run:
- "[Technology] best practices [year]"
- "[Problem type] common solutions"
- "[Library] security vulnerabilities"
- "[Framework] performance optimization"
- "[Error message] site:stackoverflow.com"

## Phase 3: Analysis Framework

### Bug Investigation
1. Reproduce the issue
2. Identify affected code paths
3. Trace data flow through the path
4. Find where behavior diverges from expectation
5. Check for race conditions, edge cases
6. Verify fix addresses root cause

### Architecture Review
1. Map high-level components
2. Identify communication patterns
3. Trace data flows
4. Document dependencies
5. Assess coupling/cohesion
6. Note technical debt

### Performance Analysis
1. Identify metrics to measure
2. Profile current performance
3. Find hotspots (CPU, memory, I/O)
4. Analyze query patterns
5. Check for unnecessary work
6. Recommend optimizations

### Security Audit
1. Map attack surface
2. Check input validation
3. Review authentication/authorization
4. Examine data handling
5. Test for common vulnerabilities (OWASP Top 10)
6. Review dependencies for CVEs

## Phase 4: Documentation

### Finding Format
```markdown
### Finding: [Title]
- **Severity**: Critical/High/Medium/Low
- **Location**: [File:Line or Component]
- **Evidence**: [What was observed]
- **Impact**: [What could happen]
- **Recommendation**: [What to do]
```

### Risk Assessment Matrix

| Probability | Impact: Low | Impact: Medium | Impact: High |
|-------------|-------------|----------------|--------------|
| High | Medium | High | Critical |
| Medium | Low | Medium | High |
| Low | Low | Low | Medium |

## Output Template

```markdown
## Executive Summary
- [3-5 bullet points of key findings]

## Detailed Findings

### [Category 1]
[Findings with evidence]

### [Category 2]
[Findings with evidence]

## Risks and Concerns
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ... | ... | ... | ... |

## Alternatives Considered
| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| ... | ... | ... | ... |

## Recommendations
1. [Priority] [Action item]
2. [Priority] [Action item]

## References
- [File]: [What it contains]
- [URL]: [What it provides]
```

## Tools to Use

| Tool | Use Case |
|------|----------|
| Glob | Find files by pattern |
| Grep | Search code content |
| Read | Examine file contents |
| WebSearch | External best practices |
| WebFetch | Documentation pages |
| Bash | Run analysis commands |

## Investigation Anti-Patterns

- Making assumptions without verification
- Stopping at first finding
- Ignoring edge cases
- Not documenting findings
- Rushing to conclusions
- Skipping external research
