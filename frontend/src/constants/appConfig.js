/**
 * Application configuration constants
 * Extracted from App.jsx for better maintainability
 */

// App UI states
export const UI_STATE = {
  HOME: 'home',
  LISTENING: 'listening',
  GENERATING: 'generating',
  SLIDESHOW: 'slideshow',
  SOCRATIC: 'socratic',
  QUIZ_PROMPT: 'quiz_prompt',
  QUIZ: 'quiz',
  QUIZ_RESULTS: 'quiz_results',
  ERROR: 'error',
}

// Explanation level options
export const EXPLANATION_LEVEL = {
  SIMPLE: 'simple',
  STANDARD: 'standard',
  DEEP: 'deep',
}

// Level card configuration
export const LEVEL_CONFIG = {
  [EXPLANATION_LEVEL.SIMPLE]: {
    icon: '\u{1F331}', // seedling emoji
    title: 'Simple',
    description: 'Everyday language, no jargon',
  },
  [EXPLANATION_LEVEL.STANDARD]: {
    icon: '\u{1F4DA}', // books emoji
    title: 'Standard',
    description: 'Balanced with key concepts',
  },
  [EXPLANATION_LEVEL.DEEP]: {
    icon: '\u{1F52C}', // microscope emoji
    title: 'Deep',
    description: 'Technical depth and nuance',
  },
}

// Generation timeout configuration
export const GENERATION_TIMEOUT = {
  STILL_WORKING_MS: 15000,
  MAX_TIMEOUT_MS: 60000,
  FUN_FACT_REFRESH_DELAY_MS: 60000,
}

// Microphone permission states
export const PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
}

// Topic and storage limits
export const STORAGE_LIMITS = {
  MAX_CACHED_TOPICS: 12,
  MAX_VERSIONS_PER_TOPIC: 5,
}

// localStorage keys
export const STORAGE_KEYS = {
  TOPICS: 'showme_topics',
  TOPIC_SLIDES_PREFIX: 'showme_topic_slides_',
  CLIENT_ID: 'showme_client_id',
}

// Storage schema versions
export const STORAGE_VERSIONS = {
  TOPICS: 3,
  TOPIC_SLIDES: 1,
}

// Audio configuration constants
export const AUDIO_CONFIG = {
  WAVEFORM_BARS: 20,
  SILENCE_THRESHOLD: 15,
  SILENCE_DURATION: 1500,
  MIN_SPEECH_DURATION_MS: 300,
  MIN_SPEECH_FRAMES: 5,
  NO_SPEECH_RETRY_MAX: 2,
  NO_SPEECH_RETRY_DELAY_MS: 350,
  FFT_SIZE: 256,
  ANIMATION_INTERVAL: 50,
  MIN_AUDIO_SIZE: 5000,
  MAX_AUDIO_SIZE: 10 * 1024 * 1024,
}

// TTS prefetch configuration
export const TTS_PREFETCH_CONFIG = {
  MAX_CONCURRENCY: 1,
  DELAY_MS: 2000,
  MAX_PREFETCH_AHEAD: 1,
  RATE_LIMIT_BACKOFF_MS: 10000,
  MIN_REQUEST_INTERVAL_MS: 3000,
}

// Slide timing constants
export const SLIDE_TIMING = {
  DEFAULT_DURATION_MS: 5000,
  TRANSITION_PAUSE_MS: 400,
  MANUAL_FINISH_GRACE_MS: 500,
  HEADER_DURATION_MS: 2000,
}

// Streaming subtitle timing tweaks
export const SUBTITLE_STREAMING_CONFIG = {
  SPEED_MULTIPLIER: 1.04,
}

// Default questions (fallback when API fails)
export const DEFAULT_QUESTIONS = [
  "How do black holes work?",
  "Why do we dream?",
  "How does WiFi work?",
]

// Display greetings for home screen
export const DISPLAY_GREETINGS = [
  "What would you like to learn today?",
  "Ready to explore something new?",
  "What's on your curious mind?",
  "Let's discover something together!",
  "What would you like to understand?",
  "Ready for a learning adventure?",
]

// Home screen headlines
export const HOME_HEADLINES = [
  "What do you want me to show you?",
  "What would you like to learn?",
  "What are you curious about?",
  "What should we explore today?",
  "What do you want to understand?",
  "What can I explain for you?",
]

// Voice agent script templates
export const VOICE_AGENT_SCRIPT = {
  GENERATION_START: "",
  PREPARING_FOLLOW_UP: "Preparing your follow-up now.",
  getSlidesReadyMessage: function(topicName, slideCount) {
    if (topicName && slideCount > 1) {
      return `Slides about ${topicName} are ready.`
    }
    if (slideCount > 1) {
      return "Your slides are ready."
    }
    return "Your explanation is ready."
  },
}

// Fallback slide image SVG
const FALLBACK_SLIDE_IMAGE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#f0f0f0" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#999">Image unavailable</text></svg>'
export const FALLBACK_SLIDE_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FALLBACK_SLIDE_IMAGE_SVG)}`

// API endpoints
export const API_ENDPOINTS = {
  SLIDES_BASE: '/api/slides',
  GENERATE: '/api/generate',
  GENERATE_FOLLOW_UP: '/api/generate/follow-up',
  GENERATE_ENGAGEMENT: '/api/generate/engagement',
  GENERATE_RESPOND: '/api/generate/respond',
  CLASSIFY: '/api/classify',
  CHITCHAT: '/api/chitchat',
  TRANSCRIBE: '/api/transcribe',
  VOICE_SPEAK: '/api/voice/speak',
  QUIZ_GENERATE: '/api/quiz/generate',
  QUIZ_EVALUATE: '/api/quiz/evaluate',
  WORLD_QUICK_XP: '/api/world/quick-xp',
}

// Trivial transcript tokens to filter
export const TRIVIAL_TRANSCRIPT_TOKENS = new Set([
  'yes', 'yeah', 'yep', 'no', 'nope', 'ok', 'okay', 'uh', 'um', 'hmm', 'hm',
  'mmm', 'mm', 'uhh', 'umm', 'er', 'ah', 'oops', 'sorry', 'please', 'thanks',
  'thank', 'hi', 'hello', 'stop', 'cancel',
])

// Short question words that are valid as single tokens
export const SHORT_QUESTION_WORDS = new Set([
  'why', 'how', 'what', 'when', 'where', 'who', 'which',
])
