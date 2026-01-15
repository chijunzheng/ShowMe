---
name: tdd-orchestrator
description: Orchestrates long-running TDD-based autonomous coding. Use when building complete applications from specs using test-driven development with multiple agent handoffs. Manages the loop between initializer and feature agents, tracks progress, and ensures all features pass their test cases before completion. Supports multiple AI backends (Claude and Gemini).
---

# TDD Orchestrator

Coordinates autonomous app development through test-driven development with fresh-context agent handoffs.

## Prerequisites

Before running the orchestrator, install **one** of the supported backends:

### Option 1: Claude Backend (default)
```bash
pip install claude-agent-sdk anyio
```

### Option 2: Gemini Backend
```bash
npm install -g @google/gemini-cli
```

Verify installation:
- Claude: `python -c "from claude_agent_sdk import query; print('OK')"`
- Gemini: `gemini --version`

## Supported Backends

| Backend | SDK/Tool | Use Flag |
|---------|----------|----------|
| **Claude** (default) | Claude Agent SDK | `--backend claude` (or omit) |
| **Gemini** | Gemini CLI | `--backend gemini` |

Both backends provide the same functionality - choose based on your preferred AI provider.

## Architecture Overview

```
User Spec → [Initializer Agent] → features.json + initial tests
                                        ↓
                              ┌─────────────────────┐
                              │   Orchestrator Loop │
                              │  (reads progress.txt)│
                              └──────────┬──────────┘
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    ↓                                         ↓
            [Feature Agent 1]                         [Feature Agent N]
            (fresh context)                           (fresh context)
                    ↓                                         ↓
              Run tests → Pass? → Update progress.txt
                              ↓
                    Loop until all features complete
```

## Project Structure

Initialize workspace with this structure:

```
project_root/
├── app_spec.md              # Original user specification
├── features.json            # Feature list with test cases (from initializer)
├── progress.txt             # Tracks completed features + context for next agent
├── src/                     # Application source code
├── tests/                   # Test files
└── .tdd/
    ├── agent_logs/          # Logs from each agent run
    └── test_results/        # Test output history
```

## Workflow

### Phase 1: Initialization

1. Create `app_spec.md` from user input
2. Invoke initializer agent with tdd-initializer skill
3. Initializer produces `features.json` and scaffolds testable project

### Phase 2: Feature Loop

For each incomplete feature in `features.json`:

1. Read `progress.txt` for context
2. Spawn fresh feature agent with tdd-feature-agent skill
3. Agent implements feature, runs tests
4. On test pass: invoke tdd-committer skill to commit changes
5. Committer verifies tests, stages files, commits with conventional message
6. On test fail: log failure, retry with error context (max 3 attempts)
7. Continue until all features complete

### Phase 3: Completion

1. Run full test suite
2. Generate completion summary
3. Clean up agent logs if successful

## Running the Orchestrator

### Using auto_runner.py (Recommended)

The `auto_runner.py` script provides full autonomous orchestration with backend selection:

```bash
# Initialize new project (Claude backend - default)
python scripts/auto_runner.py init ./my-app spec.md

# Initialize with Gemini backend
python scripts/auto_runner.py init ./my-app spec.md --backend gemini

# Run orchestration loop (Claude)
python scripts/auto_runner.py run ./my-app

# Run with Gemini
python scripts/auto_runner.py run ./my-app --backend gemini
# Or using short flag
python scripts/auto_runner.py run ./my-app -b gemini

# Check project status
python scripts/auto_runner.py status ./my-app
```

### Using orchestrate.py (Manual Mode)

The `orchestrate.py` script generates prompts for manual agent invocation:

```bash
# Initialize new project
python scripts/orchestrate.py init --spec "path/to/spec.md"

# Resume existing project
python scripts/orchestrate.py resume --project "path/to/project"

# Run single feature (for debugging)
python scripts/orchestrate.py feature --project "path/to/project" --feature "feature_id"
```

## Configuration

Create `.tdd/config.json` for customization:

```json
{
  "max_retries_per_feature": 3,
  "test_command": "pytest",
  "test_timeout_seconds": 300,
  "parallel_features": false
}
```

### Backend-Specific Configuration

The backend is selected at runtime via CLI flags, not config file. Each backend uses its own model defaults:

- **Claude**: Uses `claude-sonnet-4-20250514` by default
- **Gemini**: Uses `gemini-2.5-pro` by default

## Progress File Format

`progress.txt` is the handoff document between agents:

```
=== TDD Progress Report ===
Project: MyApp
Last Updated: 2025-01-12T10:30:00Z

## Completed Features
- [x] F001: User authentication (3 tests passed) [a1b2c3d]
- [x] F002: Database schema (5 tests passed) [e4f5g6h]

## Current Feature
- [ ] F003: REST API endpoints

## Context for Next Agent
- Using SQLite for storage (see src/db.py)
- Auth tokens stored in JWT format
- API follows OpenAPI 3.0 spec

## Known Issues
- Rate limiting not yet implemented
- Need to add input validation

## File Summary
- src/auth.py: Authentication logic
- src/db.py: Database models and queries
- src/api.py: API route handlers (in progress)
```

## Error Handling

When feature implementation fails:

1. Log full error to `.tdd/agent_logs/`
2. Append error context to `progress.txt` under "## Last Error"
3. Retry with error context included in next agent prompt
4. After max retries, pause and request human intervention
