# Coding Standards Reference

Standards and patterns for high-quality code implementation.

## Pre-Implementation Checklist

Before writing any code:
- [ ] Read CLAUDE.md or project README
- [ ] Explore existing code for patterns
- [ ] Identify naming conventions
- [ ] Find similar implementations to reference
- [ ] Check configuration files (package.json, pyproject.toml, etc.)

## Naming Conventions

### Variables
```python
# Python - snake_case
user_count = 0
active_sessions = []

# JavaScript - camelCase
userCount = 0
activeSessions = []
```

### Functions/Methods
```python
# Python - snake_case, verb first
def get_user_by_id(user_id):
def validate_email(email):
def calculate_total_price(items):

# JavaScript - camelCase, verb first
function getUserById(userId) {}
function validateEmail(email) {}
function calculateTotalPrice(items) {}
```

### Classes
```python
# PascalCase in all languages
class UserAccount:
class PaymentProcessor:
class HttpRequestHandler:
```

### Constants
```python
# SCREAMING_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_MS = 5000
API_BASE_URL = "https://api.example.com"
```

## Code Organization

### File Length
- Aim for < 300 lines per file
- Split large files by responsibility

### Function Length
- Aim for < 30 lines per function
- Extract complex logic into helpers

### Import Order
```python
# Python
# 1. Standard library
import os
import sys

# 2. Third-party
import requests
from flask import Flask

# 3. Local application
from src.models import User
from src.utils import format_date
```

```javascript
// JavaScript/TypeScript
// 1. External packages
import React from 'react';
import axios from 'axios';

// 2. Internal modules
import { User } from '@/models';
import { formatDate } from '@/utils';

// 3. Relative imports
import { Button } from './Button';
import styles from './styles.module.css';
```

## Error Handling

### Python
```python
# Specific exceptions, meaningful messages
def get_user(user_id: int) -> User:
    if user_id < 0:
        raise ValueError(f"Invalid user_id: {user_id}")

    user = db.query(User).get(user_id)
    if not user:
        raise UserNotFoundError(f"User {user_id} not found")

    return user
```

### JavaScript
```javascript
// Custom error classes
class UserNotFoundError extends Error {
  constructor(userId) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
    this.userId = userId;
  }
}

async function getUser(userId) {
  const user = await db.users.findById(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  return user;
}
```

## Comments

### When to Comment
```python
# YES - Explain WHY
# Using retry with exponential backoff because the API
# has rate limits and occasional 503 errors
for attempt in range(max_retries):
    ...

# NO - Explaining WHAT (the code already shows this)
# Loop through users
for user in users:
    ...
```

### Documentation Format
```python
def calculate_shipping_cost(weight: float, destination: str) -> float:
    """Calculate shipping cost based on weight and destination.

    Uses tiered pricing: $5 base + $2/kg for domestic,
    $15 base + $5/kg for international.

    Args:
        weight: Package weight in kilograms
        destination: Two-letter country code

    Returns:
        Total shipping cost in USD

    Raises:
        ValueError: If weight is negative or destination is invalid
    """
```

## Security Checklist

- [ ] No hardcoded secrets
- [ ] Inputs validated and sanitized
- [ ] Parameterized queries (no string concatenation)
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS for all external calls
- [ ] Auth checks before sensitive operations

## Verification Commands

```bash
# Python
ruff check .                    # Linting
mypy .                          # Type checking
black --check .                 # Formatting
pytest tests/ -v                # Tests

# JavaScript/TypeScript
npm run lint                    # ESLint
npm run type-check              # TypeScript
npx prettier --check .          # Formatting
npm test                        # Tests

# Go
go vet ./...                    # Static analysis
go test ./...                   # Tests
gofmt -l .                      # Formatting
```
