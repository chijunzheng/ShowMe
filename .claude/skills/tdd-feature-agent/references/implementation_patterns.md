# Implementation Patterns for Feature Agents

Common patterns and solutions for implementing features in TDD projects.

## Reading Test Expectations

Before implementing, understand what tests expect:

```python
# Test says:
def test_user_has_email():
    user = User(email="test@example.com")
    assert user.email == "test@example.com"

# Implementation must:
# 1. Accept email in constructor
# 2. Store it accessible as .email
# 3. NOT validate, transform, or modify (unless other tests require it)
```

## Minimal Implementation Strategy

Only implement what tests require:

```python
# Test:
def test_add_numbers():
    assert add(2, 3) == 5

# Minimal implementation:
def add(a, b):
    return a + b

# NOT over-engineered:
def add(a, b):
    if not isinstance(a, (int, float)):
        raise TypeError("a must be numeric")
    if not isinstance(b, (int, float)):
        raise TypeError("b must be numeric")
    result = a + b
    logger.info(f"Added {a} + {b} = {result}")
    return result
```

## Database Patterns

### SQLAlchemy Models
```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    
    # Relationship (if tests require it)
    tasks = relationship("Task", back_populates="user")
```

### Database Session
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///app.db')
Session = sessionmaker(bind=engine)

def get_session():
    return Session()
```

## API Patterns

### Flask Endpoint
```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    user = User(**data)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
```

### FastAPI Endpoint
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    email: str
    name: str

@app.get("/users")
async def get_users():
    return await User.all()

@app.post("/users", status_code=201)
async def create_user(user: UserCreate):
    return await User.create(**user.dict())
```

## Error Handling Patterns

Match error handling to test expectations:

```python
# If test expects specific exception:
def test_invalid_email_raises():
    with pytest.raises(ValueError, match="Invalid email"):
        User(email="not-an-email")

# Implementation:
class User:
    def __init__(self, email):
        if "@" not in email:
            raise ValueError("Invalid email")
        self.email = email
```

## Fixture Integration

Using pytest fixtures from conftest.py:

```python
# conftest.py defines:
@pytest.fixture
def db_session():
    ...

# Your test uses it:
def test_save_user(db_session):
    user = User(email="test@example.com")
    user.save(db_session)
    assert db_session.query(User).count() == 1

# Your implementation accepts it:
class User:
    def save(self, session):
        session.add(self)
        session.commit()
```

## Common Import Fixes

```python
# Wrong (module not in Python path):
from models import User

# Correct (explicit src path):
from src.models import User

# Or with relative import (if in same package):
from .models import User
```

## Progress.txt Context Examples

Good context notes for next agent:

```markdown
## Context for Next Agent
- Database uses SQLite at ./data/app.db
- User model requires email validation (regex in src/validators.py)
- All endpoints require JWT auth (use @require_auth decorator from src/auth.py)
- Rate limiting is NOT implemented yet - don't add it unless tests require
```

## Debugging Failing Tests

When tests fail unexpectedly:

```bash
# Run with verbose output
pytest -v tests/test_feature.py

# Show print statements
pytest -s tests/test_feature.py

# Stop on first failure
pytest -x tests/test_feature.py

# Show local variables on failure
pytest -l tests/test_feature.py

# Run specific test
pytest tests/test_feature.py::test_specific_case -v
```
