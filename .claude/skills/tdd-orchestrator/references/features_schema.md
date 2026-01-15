# Features JSON Schema

The `features.json` file is the central source of truth for what needs to be built.

## Schema

```json
{
  "project_name": "string - name of the project",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp",
  "test_framework": "pytest | jest | mocha | go test | etc",
  "features": [
    {
      "id": "string - unique identifier (F001, F002, etc)",
      "name": "string - short feature name",
      "description": "string - detailed description of what this feature does",
      "priority": "number - lower is higher priority (1 = highest)",
      "dependencies": ["array of feature IDs that must be complete first"],
      "status": "pending | in_progress | complete | failed",
      "retry_count": "number - how many times implementation was attempted",
      "test_cases": [
        {
          "id": "string - unique test ID (T001, T002, etc)",
          "description": "string - what this test verifies",
          "test_file": "string - path to test file and function",
          "status": "pending | passed | failed",
          "last_error": "string | null - error message if failed"
        }
      ],
      "implementation_notes": "string | null - notes from implementing agent",
      "files_modified": ["array of files this feature touched"]
    }
  ]
}
```

## Status Flow

```
pending → in_progress → complete
                ↓
             failed (after max retries)
```

## Example

```json
{
  "project_name": "TaskManager",
  "created_at": "2025-01-12T10:00:00Z",
  "updated_at": "2025-01-12T14:30:00Z",
  "test_framework": "pytest",
  "features": [
    {
      "id": "F001",
      "name": "Database Models",
      "description": "SQLAlchemy models for User and Task entities",
      "priority": 1,
      "dependencies": [],
      "status": "complete",
      "retry_count": 0,
      "test_cases": [
        {
          "id": "T001",
          "description": "User model has required fields",
          "test_file": "tests/test_models.py::test_user_model_fields",
          "status": "passed",
          "last_error": null
        },
        {
          "id": "T002",
          "description": "Task model links to User",
          "test_file": "tests/test_models.py::test_task_user_relationship",
          "status": "passed",
          "last_error": null
        }
      ],
      "implementation_notes": "Used SQLite for dev, models in src/models.py",
      "files_modified": ["src/models.py", "src/database.py"]
    },
    {
      "id": "F002",
      "name": "User Authentication",
      "description": "JWT-based auth with login/logout endpoints",
      "priority": 2,
      "dependencies": ["F001"],
      "status": "in_progress",
      "retry_count": 1,
      "test_cases": [
        {
          "id": "T003",
          "description": "Login returns valid JWT",
          "test_file": "tests/test_auth.py::test_login_returns_jwt",
          "status": "passed",
          "last_error": null
        },
        {
          "id": "T004",
          "description": "Invalid credentials rejected",
          "test_file": "tests/test_auth.py::test_invalid_login",
          "status": "failed",
          "last_error": "AssertionError: Expected 401, got 500"
        }
      ],
      "implementation_notes": null,
      "files_modified": ["src/auth.py"]
    }
  ]
}
```

## Best Practices for Feature Definition

1. **Atomic features**: Each feature should be implementable independently (given dependencies)
2. **Clear boundaries**: Feature scope should be unambiguous
3. **Testable**: Every feature must have concrete, automated test cases
4. **Ordered dependencies**: Features should be ordered so dependencies come first
5. **2-5 tests per feature**: Enough coverage without overwhelming the agent
