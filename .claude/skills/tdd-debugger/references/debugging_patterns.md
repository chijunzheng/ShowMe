# TDD Debugging Patterns Reference

Quick reference for common debugging scenarios.

## Pytest Command Reference

```bash
# Basic commands
pytest tests/ -v                    # Verbose output
pytest tests/ -x                    # Stop on first failure
pytest tests/ -s                    # Show print statements
pytest tests/ --tb=short            # Short traceback
pytest tests/ --tb=long             # Full traceback
pytest tests/ --tb=no               # No traceback

# Specific tests
pytest tests/test_file.py                        # One file
pytest tests/test_file.py::test_function         # One test
pytest tests/test_file.py::TestClass::test_method # Method in class
pytest -k "filter"                               # Tests matching pattern

# Debugging
pytest --pdb                        # Drop into debugger on failure
pytest --lf                         # Run last failed tests only
pytest --ff                         # Run failed tests first
pytest -p no:randomly               # Disable random order plugin

# Output
pytest --collect-only               # List tests without running
pytest --fixtures                   # Show available fixtures
pytest -v --tb=line                 # One-line per failure
```

## Error Message Cheatsheet

| Error | Usually Means |
|-------|---------------|
| `AssertionError` | Test expectation not met |
| `AttributeError: 'X' has no attribute 'y'` | Wrong object type, typo, or missing field |
| `TypeError: 'NoneType'` | Function returned None unexpectedly |
| `KeyError: 'x'` | Dict missing expected key |
| `IndexError: list index out of range` | Empty list or wrong index |
| `ImportError` | Module not found, circular import |
| `IntegrityError` | Database constraint violation |
| `OperationalError` | Database connection/query issue |
| `fixture 'x' not found` | Missing fixture or wrong scope |

## Common Failure Patterns

### 1. Empty Result Set

**Symptoms:**
```python
assert len(results) == 3  # AssertionError: 0 != 3
```

**Debug checklist:**
- [ ] Is data being created in test setup?
- [ ] Is the query filter correct?
- [ ] Is the transaction committed?
- [ ] Is the correct database being used?

```bash
# Check if data exists
pytest -s  # Add: print(db.query(Model).all())
```

### 2. Wrong Value

**Symptoms:**
```python
assert user.status == "active"  # AssertionError: "pending" != "active"
```

**Debug checklist:**
- [ ] Where is status being set?
- [ ] Is there a default value?
- [ ] Is update being saved?
- [ ] Is the right object being modified?

```bash
# Trace the value
grep -rn "status.*=" src/
```

### 3. None Returned

**Symptoms:**
```python
result = get_user(1)
assert result.name == "Alice"  # AttributeError: 'NoneType'...
```

**Debug checklist:**
- [ ] Does the record exist?
- [ ] Is the ID correct?
- [ ] Is there a return statement?
- [ ] Is the query finding the record?

### 4. Test Order Dependency

**Symptoms:**
- Test passes when run alone: `pytest test.py::test_a -v` ✓
- Test fails when run with others: `pytest test.py -v` ✗

**Debug:**
```bash
# Find the polluting test
pytest test.py::test_b test.py::test_a -v  # Try pairs
pytest test.py --random-order              # Randomize
```

**Common causes:**
- Shared database state not cleaned up
- Global variable modified
- File created but not deleted
- Cache not invalidated

### 5. Flaky Tests

**Symptoms:**
- Same test sometimes passes, sometimes fails
- No code changes between runs

**Debug:**
```bash
# Run multiple times
for i in {1..20}; do
  pytest test.py::test_flaky -v || echo "FAILED on run $i"
done
```

**Common causes:**
- Time-dependent logic (`datetime.now()`)
- Random data generation
- Race conditions
- External service dependency

### 6. Import/Module Errors

**Symptoms:**
```
ImportError: cannot import name 'X' from 'Y'
ModuleNotFoundError: No module named 'Z'
```

**Debug:**
```bash
# Check Python path
python -c "import sys; print(sys.path)"

# Try importing step by step
python -c "import src"
python -c "from src import module"
python -c "from src.module import function"

# Check for circular imports
grep -l "from src.a import" src/b.py
grep -l "from src.b import" src/a.py
```

## Git Debugging Commands

```bash
# When did this test start failing?
git log --oneline -20

# What changed in files related to test?
git log --oneline -- src/api.py tests/test_api.py

# Diff between working and broken
git diff <good-commit> HEAD -- src/

# Find commit that broke test (binary search)
git bisect start
git bisect bad HEAD
git bisect good <last-known-good>
git bisect run pytest tests/test_file.py::test_name -x

# Undo bisect
git bisect reset
```

## Database Debugging

```python
# SQLAlchemy: See generated SQL
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Check what's in the database
print(db.query(User).all())

# Check the query being generated
print(str(db.query(User).filter(User.status == 'active')))

# Verify transaction state
print(f"In transaction: {db.in_transaction()}")
print(f"Pending changes: {db.new}, {db.dirty}, {db.deleted}")
```

## Fixture Debugging

```python
# tests/conftest.py

@pytest.fixture
def db_session():
    """Debug: Add logging to fixtures"""
    print("FIXTURE: Creating db_session")
    session = create_session()
    yield session
    print("FIXTURE: Cleaning up db_session")
    session.rollback()
    session.close()
```

```bash
# See fixture setup/teardown
pytest -v -s --setup-show tests/test_file.py
```

## Quick Diagnosis Flow

```
Test Failed
    │
    ▼
┌─────────────────────┐
│ Read error message  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────┐
│ AssertionError?     │──▶  │ Check expected  │
│                     │     │ vs actual value │
└──────────┬──────────┘     └─────────────────┘
           │ No
           ▼
┌─────────────────────┐     ┌─────────────────┐
│ AttributeError?     │──▶  │ Object is None  │
│ TypeError?          │     │ or wrong type   │
└──────────┬──────────┘     └─────────────────┘
           │ No
           ▼
┌─────────────────────┐     ┌─────────────────┐
│ ImportError?        │──▶  │ Check imports,  │
│                     │     │ circular deps   │
└──────────┬──────────┘     └─────────────────┘
           │ No
           ▼
┌─────────────────────┐     ┌─────────────────┐
│ Database error?     │──▶  │ Check queries,  │
│                     │     │ transactions    │
└──────────┬──────────┘     └─────────────────┘
           │ No
           ▼
┌─────────────────────┐
│ Run with -s --pdb   │
│ to investigate      │
└─────────────────────┘
```

## Minimal Fix Templates

### Fix: Missing Filter
```python
# Before
tasks = db.query(Task).all()

# After
tasks = db.query(Task).filter(Task.status == status).all()
```

### Fix: Missing Return
```python
# Before
def get_user(id):
    user = db.query(User).get(id)
    # forgot return!

# After
def get_user(id):
    user = db.query(User).get(id)
    return user
```

### Fix: Test Isolation
```python
# Before
@pytest.fixture
def db():
    return create_session()

# After
@pytest.fixture
def db():
    session = create_session()
    yield session
    session.rollback()  # Clean up!
```

### Fix: None Check
```python
# Before
def process(item):
    return item.value * 2

# After
def process(item):
    if item is None:
        return None
    return item.value * 2
```
