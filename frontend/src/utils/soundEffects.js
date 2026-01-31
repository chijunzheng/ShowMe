/**
 * Sound Effects Utility
 *
 * Generates gentle synthesized tones using the Web Audio API for voice interactions.
 * Uses soft, pleasant sounds that are non-intrusive and complement the voice-first experience.
 *
 * Sound Types:
 * - micOn: Soft rising tone when mic starts listening
 * - recordingComplete: Gentle confirmation tone when recording stops
 *
 * Usage:
 *   import { playMicOnSound, playRecordingCompleteSound } from './utils/soundEffects'
 *   playMicOnSound()          // When user activates mic
 *   playRecordingCompleteSound() // When recording finishes
 */

// Shared AudioContext instance for efficient resource usage
let audioContext = null

/**
 * Get or create the shared AudioContext.
 * We lazily initialize to avoid browser autoplay restrictions.
 * @returns {AudioContext} The shared audio context
 */
function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/**
 * Play a tone with the given parameters.
 * Creates oscillator and gain nodes for a smooth, pleasant sound.
 *
 * @param {Object} options - Tone configuration
 * @param {number} options.frequency - Starting frequency in Hz
 * @param {number} [options.endFrequency] - Ending frequency for pitch sweep (optional)
 * @param {number} options.duration - Duration in seconds
 * @param {number} options.volume - Peak volume (0-1)
 * @param {string} options.waveform - Oscillator type ('sine', 'triangle', etc.)
 * @param {number} [options.attackTime] - Attack time in seconds (default: 0.01)
 * @param {number} [options.releaseTime] - Release time in seconds (default: half of duration)
 */
function playTone({
  frequency,
  endFrequency,
  duration,
  volume,
  waveform = 'sine',
  attackTime = 0.01,
  releaseTime,
}) {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Create oscillator for the tone
    const oscillator = ctx.createOscillator()
    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(frequency, now)

    // Apply frequency sweep if endFrequency is specified
    if (endFrequency && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        now + duration
      )
    }

    // Create gain node for volume envelope (ADSR-like)
    const gainNode = ctx.createGain()
    const release = releaseTime ?? duration * 0.5

    // Attack phase: quick fade in
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(volume, now + attackTime)

    // Sustain then release: fade out
    const sustainEnd = now + duration - release
    gainNode.gain.setValueAtTime(volume, sustainEnd)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

    // Connect nodes: oscillator -> gain -> output
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Play the tone
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)

    // Cleanup after sound completes
    oscillator.onended = () => {
      oscillator.disconnect()
      gainNode.disconnect()
    }
  } catch (error) {
    // Silently fail - audio feedback is enhancement, not critical
    console.debug('[SoundEffects] Failed to play tone:', error.message)
  }
}

/**
 * Play a multi-note sequence (chord or arpeggio).
 *
 * @param {Array<Object>} notes - Array of note configurations
 * @param {number} notes[].frequency - Frequency in Hz
 * @param {number} [notes[].delay] - Delay before this note starts (seconds)
 * @param {number} notes[].duration - Duration in seconds
 * @param {number} notes[].volume - Volume (0-1)
 * @param {string} [notes[].waveform] - Oscillator type
 */
function playSequence(notes) {
  notes.forEach((note) => {
    const delay = note.delay || 0
    if (delay > 0) {
      setTimeout(() => playTone(note), delay * 1000)
    } else {
      playTone(note)
    }
  })
}

/**
 * Play the "mic on" sound.
 * A gentle rising two-note chime that signals mic activation.
 * Uses soft triangle waves with a pleasant major third interval.
 */
export function playMicOnSound() {
  // Soft two-note rising chime (C5 -> E5, major third)
  // Triangle wave is softer than sine, more organic
  playSequence([
    {
      frequency: 523.25, // C5
      duration: 0.12,
      volume: 0.15,
      waveform: 'triangle',
      attackTime: 0.008,
      releaseTime: 0.08,
    },
    {
      frequency: 659.25, // E5
      delay: 0.06,
      duration: 0.15,
      volume: 0.12,
      waveform: 'triangle',
      attackTime: 0.008,
      releaseTime: 0.1,
    },
  ])
}

/**
 * Play the "recording complete" sound.
 * An energetic ascending three-note sequence that conveys "got it, coming right up!"
 * Uses a quick major chord arpeggio going UP for positive momentum and anticipation.
 */
export function playRecordingCompleteSound() {
  // Ascending major chord arpeggio: C5 -> E5 -> G5
  // Quick "da-da-ding!" with increasing brightness and energy
  // Each note slightly overlaps for a smooth, connected feel
  playSequence([
    {
      frequency: 523.25, // C5 - "got"
      duration: 0.1,
      volume: 0.18,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.06,
    },
    {
      frequency: 659.25, // E5 - "it"
      delay: 0.07,
      duration: 0.1,
      volume: 0.2,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.06,
    },
    {
      frequency: 783.99, // G5 - "!" (the affirming high note)
      delay: 0.14,
      duration: 0.18,
      volume: 0.22,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.12,
    },
  ])
}

/**
 * Play the "achievement unlocked" sound.
 * POLISH-001 T006: Celebratory fanfare for badge unlocks.
 * A bright, ascending arpeggio with a triumphant finish.
 */
export function playAchievementSound() {
  // Celebratory ascending fanfare: C5 -> E5 -> G5 -> C6
  // Major chord arpeggio with triumphant high octave finish
  playSequence([
    {
      frequency: 523.25, // C5
      duration: 0.12,
      volume: 0.2,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.08,
    },
    {
      frequency: 659.25, // E5
      delay: 0.08,
      duration: 0.12,
      volume: 0.22,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.08,
    },
    {
      frequency: 783.99, // G5
      delay: 0.16,
      duration: 0.12,
      volume: 0.24,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.08,
    },
    {
      frequency: 1046.50, // C6 - triumphant high note
      delay: 0.24,
      duration: 0.35,
      volume: 0.28,
      waveform: 'sine',
      attackTime: 0.008,
      releaseTime: 0.25,
    },
  ])
}

/**
 * Play the "tier up" sound.
 * UI008: Celebratory fanfare for tier upgrades with triumphant ascending sequence.
 * More elaborate than achievement sound to signify major milestone.
 */
export function playTierUpSound() {
  // Triumphant ascending fanfare: C5 -> E5 -> G5 -> C6 with sustained finish
  // More dramatic and longer than standard achievement
  playSequence([
    {
      frequency: 523.25, // C5
      duration: 0.15,
      volume: 0.22,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.1,
    },
    {
      frequency: 659.25, // E5
      delay: 0.12,
      duration: 0.15,
      volume: 0.24,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.1,
    },
    {
      frequency: 783.99, // G5
      delay: 0.24,
      duration: 0.15,
      volume: 0.26,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.1,
    },
    {
      frequency: 1046.50, // C6 - triumphant high note
      delay: 0.36,
      duration: 0.5,
      volume: 0.3,
      waveform: 'sine',
      attackTime: 0.01,
      releaseTime: 0.35,
    },
    // Add a subtle harmonizing note for richness
    {
      frequency: 1318.51, // E6 - harmonic third above C6
      delay: 0.40,
      duration: 0.45,
      volume: 0.15,
      waveform: 'triangle',
      attackTime: 0.02,
      releaseTime: 0.35,
    },
  ])
}

/**
 * Play the "streak increment" sound.
 * A quick, energetic double-beep for streak milestones.
 */
export function playStreakSound() {
  // Quick double-beep with rising pitch
  playSequence([
    {
      frequency: 880, // A5
      duration: 0.08,
      volume: 0.15,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.05,
    },
    {
      frequency: 1108.73, // C#6
      delay: 0.1,
      duration: 0.12,
      volume: 0.18,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.08,
    },
  ])
}

/**
 * Play the "evolution" sound.
 * WB020: Magical ascending sequence for piece evolution celebrations.
 * Creates a sense of transformation and wonder appropriate for kids.
 * Longer and more elaborate than tier-up to emphasize the special moment.
 */
export function playEvolutionSound() {
  // Magical ascending arpeggio with shimmering harmonics
  // E5 -> G#5 -> B5 -> E6 with sparkling overlay
  playSequence([
    // Base arpeggio - major chord ascending
    {
      frequency: 659.25, // E5 - warm start
      duration: 0.15,
      volume: 0.2,
      waveform: 'sine',
      attackTime: 0.008,
      releaseTime: 0.1,
    },
    {
      frequency: 830.61, // G#5 - rising
      delay: 0.12,
      duration: 0.15,
      volume: 0.22,
      waveform: 'sine',
      attackTime: 0.008,
      releaseTime: 0.1,
    },
    {
      frequency: 987.77, // B5 - building
      delay: 0.24,
      duration: 0.15,
      volume: 0.24,
      waveform: 'sine',
      attackTime: 0.008,
      releaseTime: 0.1,
    },
    {
      frequency: 1318.51, // E6 - triumphant peak
      delay: 0.36,
      duration: 0.5,
      volume: 0.28,
      waveform: 'sine',
      attackTime: 0.01,
      releaseTime: 0.35,
    },
    // Sparkling harmonics overlay
    {
      frequency: 1567.98, // G6 - sparkle 1
      delay: 0.40,
      duration: 0.3,
      volume: 0.12,
      waveform: 'triangle',
      attackTime: 0.02,
      releaseTime: 0.25,
    },
    {
      frequency: 1975.53, // B6 - sparkle 2
      delay: 0.45,
      duration: 0.25,
      volume: 0.1,
      waveform: 'triangle',
      attackTime: 0.02,
      releaseTime: 0.2,
    },
    // Final shimmer
    {
      frequency: 2637.02, // E7 - high shimmer
      delay: 0.50,
      duration: 0.35,
      volume: 0.08,
      waveform: 'sine',
      attackTime: 0.03,
      releaseTime: 0.3,
    },
  ])
}

/**
 * Play the "correct answer" sound.
 * Quick ascending chime that rewards correct answers in quizzes.
 * Uses bright, cheerful tones that feel satisfying without being overwhelming.
 */
export function playCorrectSound() {
  // Ascending two-note chime: G5 -> C6 (perfect fourth up)
  // Bright and affirming, quick reward feedback
  playSequence([
    {
      frequency: 783.99, // G5 - affirming start
      duration: 0.1,
      volume: 0.18,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.06,
    },
    {
      frequency: 1046.50, // C6 - happy resolution
      delay: 0.08,
      duration: 0.15,
      volume: 0.2,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.1,
    },
  ])
}

/**
 * Play the "partial credit" sound.
 * Encouraging tone for partially correct answers.
 * Warm and supportive, not as triumphant as correct but still positive.
 */
export function playPartialSound() {
  // Single warm tone with slight rise: E5 -> F5
  // Encouraging but indicates room for improvement
  playSequence([
    {
      frequency: 659.25, // E5 - warm, encouraging
      endFrequency: 698.46, // F5 - slight upward bend
      duration: 0.2,
      volume: 0.16,
      waveform: 'triangle',
      attackTime: 0.01,
      releaseTime: 0.12,
    },
  ])
}

/**
 * Play the "incorrect answer" sound.
 * Gentle low tone for wrong answers - not punishing, just informative.
 * Designed to be kind to kids while signaling "try again".
 */
export function playIncorrectSound() {
  // Single soft, low tone: A3
  // Gentle and brief, not discouraging
  playSequence([
    {
      frequency: 220.00, // A3 - soft low note
      duration: 0.18,
      volume: 0.12, // Quieter than success sounds
      waveform: 'sine',
      attackTime: 0.02,
      releaseTime: 0.12,
    },
  ])
}

/**
 * Play the "option select" sound.
 * Soft tap/click when selecting an option in quizzes.
 * Very brief and subtle, just tactile feedback.
 */
export function playSelectSound() {
  // Ultra-short high tap: B5
  // Like a soft button click
  playSequence([
    {
      frequency: 987.77, // B5 - crisp tap
      duration: 0.04,
      volume: 0.1, // Very quiet
      waveform: 'triangle',
      attackTime: 0.003,
      releaseTime: 0.025,
    },
  ])
}

/**
 * Play the "build-up" sound.
 * Anticipation effect before revealing quiz answer.
 * Rising tension that builds excitement.
 */
export function playBuildUpSound() {
  // Ascending sequence with increasing tempo: C5 -> D5 -> E5 -> F5 -> G5
  // Creates anticipation and excitement
  playSequence([
    {
      frequency: 523.25, // C5
      duration: 0.08,
      volume: 0.1,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.05,
    },
    {
      frequency: 587.33, // D5
      delay: 0.1,
      duration: 0.08,
      volume: 0.12,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.05,
    },
    {
      frequency: 659.25, // E5
      delay: 0.18,
      duration: 0.08,
      volume: 0.14,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.05,
    },
    {
      frequency: 698.46, // F5
      delay: 0.24,
      duration: 0.08,
      volume: 0.16,
      waveform: 'triangle',
      attackTime: 0.005,
      releaseTime: 0.05,
    },
    {
      frequency: 783.99, // G5 - peak anticipation
      delay: 0.28,
      duration: 0.1,
      volume: 0.18,
      waveform: 'sine',
      attackTime: 0.005,
      releaseTime: 0.06,
    },
  ])
}

/**
 * Preload the audio context to reduce latency on first sound.
 * Call this on user interaction (e.g., first button click).
 */
export function preloadAudioContext() {
  try {
    getAudioContext()
  } catch (error) {
    // Silently fail - will retry on first sound
  }
}

/**
 * Reset the audio context (for testing purposes only).
 * This allows tests to inject mocked AudioContext instances.
 * @private
 */
export function _resetAudioContext() {
  audioContext = null
}

// Export all functions as named exports
export default {
  playMicOnSound,
  playRecordingCompleteSound,
  playAchievementSound,
  playTierUpSound,
  playStreakSound,
  playEvolutionSound,
  playCorrectSound,
  playPartialSound,
  playIncorrectSound,
  playSelectSound,
  playBuildUpSound,
  preloadAudioContext,
}
