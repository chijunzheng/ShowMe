# Test Writing Patterns for TDD Initialization

When scaffolding tests, follow these patterns to create effective failing tests.

## Python (pytest)

### Basic Test Structure
```python
import pytest
from src.module import TargetClass, target_function

class TestTargetClass:
    """Tests for TargetClass functionality."""
    
    def test_initialization(self):
        """Test that TargetClass can be instantiated."""
        obj = TargetClass()
        assert obj is not None
    
    def test_required_method_exists(self):
        """Test that required method is callable."""
        obj = TargetClass()
        assert hasattr(obj, 'required_method')
        assert callable(obj.required_method)

def test_target_function_happy_path():
    """Test target_function with valid input."""
    result = target_function("valid_input")
    assert result is not None
    assert result.success is True

def test_target_function_edge_case():
    """Test target_function handles edge case."""
    result = target_function("")
    assert result.error is not None
```

### Fixtures (conftest.py)
```python
import pytest

@pytest.fixture
def sample_user():
    """Provide a sample user for tests."""
    return {"id": 1, "email": "test@example.com", "name": "Test User"}

@pytest.fixture
def db_session():
    """Provide a database session for tests."""
    # Setup
    session = create_test_session()
    yield session
    # Teardown
    session.rollback()
    session.close()
```

### API Testing
```python
import pytest
from src.app import create_app

@pytest.fixture
def client():
    """Create test client."""
    app = create_app(testing=True)
    return app.test_client()

def test_api_get_users(client):
    """Test GET /users returns list."""
    response = client.get('/users')
    assert response.status_code == 200
    assert isinstance(response.json, list)

def test_api_create_user(client):
    """Test POST /users creates user."""
    response = client.post('/users', json={
        "email": "new@example.com",
        "name": "New User"
    })
    assert response.status_code == 201
    assert "id" in response.json
```

## JavaScript (Jest)

### Basic Test Structure
```javascript
const { TargetClass, targetFunction } = require('../src/module');

describe('TargetClass', () => {
  it('should instantiate correctly', () => {
    const obj = new TargetClass();
    expect(obj).toBeDefined();
  });

  it('should have required method', () => {
    const obj = new TargetClass();
    expect(typeof obj.requiredMethod).toBe('function');
  });
});

describe('targetFunction', () => {
  it('should handle valid input', () => {
    const result = targetFunction('valid_input');
    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
  });

  it('should handle empty input', () => {
    const result = targetFunction('');
    expect(result.error).toBeDefined();
  });
});
```

### Async Testing
```javascript
describe('asyncOperation', () => {
  it('should resolve with data', async () => {
    const result = await asyncOperation();
    expect(result.data).toBeDefined();
  });

  it('should reject on error', async () => {
    await expect(asyncOperation('invalid')).rejects.toThrow('Invalid input');
  });
});
```

## Test Naming Conventions

Follow: `test_<unit>_<scenario>_<expected_outcome>`

Good examples:
- `test_user_creation_with_valid_email_succeeds`
- `test_login_with_invalid_password_returns_401`
- `test_calculate_total_with_empty_cart_returns_zero`

Bad examples:
- `test1`
- `test_user`
- `test_it_works`

## Coverage Guidelines

For each feature, ensure tests cover:

1. **Happy path**: Normal, expected usage
2. **Empty/null input**: What happens with no data
3. **Invalid input**: What happens with bad data
4. **Boundary conditions**: Edge cases (max length, zero, negative)
5. **Error conditions**: Expected failures

## Making Tests Fail Correctly

Tests should fail for the RIGHT reason:

✅ Good (fails because module doesn't exist):
```python
def test_user_has_email():
    from src.models import User  # ModuleNotFoundError
    user = User(email="test@example.com")
    assert user.email == "test@example.com"
```

❌ Bad (fails for wrong reason):
```python
def test_user_has_email():
    assert False  # Always fails, not useful
```

❌ Bad (might pass accidentally):
```python
def test_user_has_email():
    user = type('User', (), {'email': 'test@example.com'})()  # Fake implementation
    assert user.email == "test@example.com"
```
