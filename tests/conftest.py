"""
ShowMe TDD Test Configuration

This file contains pytest fixtures and configuration for testing
the ShowMe voice-first educational app.
"""

import pytest
import os

# Test constants
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:3001')
WS_URL = os.environ.get('WS_URL', 'ws://localhost:3001/ws/generation')

# Example questions (from app spec)
EXAMPLE_QUESTIONS = [
    "How do black holes work?",
    "Why do we dream?",
    "How does WiFi work?",
]


@pytest.fixture
def frontend_url():
    """Return the frontend URL for testing."""
    return FRONTEND_URL


@pytest.fixture
def backend_url():
    """Return the backend URL for testing."""
    return BACKEND_URL


@pytest.fixture
def ws_url():
    """Return the WebSocket URL for testing."""
    return WS_URL


@pytest.fixture
def example_questions():
    """Return the list of example questions."""
    return EXAMPLE_QUESTIONS


@pytest.fixture
def test_query():
    """Return a unique test query for data verification."""
    import time
    return f"TEST_QUERY_{int(time.time())}_How does photosynthesis work?"


@pytest.fixture
def api_headers():
    """Return headers for API requests."""
    return {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
    }


class MockGenerationResponse:
    """Mock response structure for testing."""

    def __init__(self):
        self.slides = [
            {
                'id': 'slide_1',
                'topicId': 'topic_1',
                'imageUrl': 'data:image/png;base64,mock',
                'audioUrl': 'data:audio/mp3;base64,mock',
                'subtitle': 'This is a test slide.',
                'duration': 5.0,
                'segmentId': 'seg_1',
                'isTopicHeader': False,
            }
        ]
        self.topic = {
            'id': 'topic_1',
            'name': 'Test Topic',
            'icon': '📚',
        }
        self.segmentId = 'seg_1'


@pytest.fixture
def mock_generation_response():
    """Return a mock generation response for testing."""
    return MockGenerationResponse()
