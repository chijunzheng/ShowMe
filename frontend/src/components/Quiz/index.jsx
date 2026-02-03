/**
 * Quiz Component
 * WB002/WB003: Main orchestrator for quiz flow
 *
 * Features:
 * - Manages quiz state (current question, answers, feedback)
 * - Handles navigation between questions
 * - Supports MCQ and Fill-in-blank question types
 * - Tracks results and calls onComplete when finished
 * - Animated transitions between questions
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import QuizProgress from './QuizProgress'
import MCQQuestion from './MCQQuestion'
import FillBlankQuestion from './FillBlankQuestion'
import VoiceQuestion from './VoiceQuestion'
import YesNoQuestion from './YesNoQuestion'
import PictureMatchQuestion from './PictureMatchQuestion'
import OddOneOutQuestion from './OddOneOutQuestion'
import SortGroupsQuestion from './SortGroupsQuestion'
import FindErrorQuestion from './FindErrorQuestion'
import SpotItQuestion from './SpotItQuestion'
import SequenceQuestion from './SequenceQuestion'
import ApplyConceptQuestion from './ApplyConceptQuestion'
import QuizFeedback from './QuizFeedback'
import QuizPrompt from './QuizPrompt'
import QuizResults, { AnimatedXP } from './QuizResults'
import QuizSlidePreview from './QuizSlidePreview'
import ComboIndicator from './ComboIndicator'
import StreakCelebration from './StreakCelebration'
import QuizTimer from './QuizTimer'
import MicroCelebration from './MicroCelebration'
import useQuizGamification from './useQuizGamification'
import { fuzzyMatch } from '../../utils/fuzzyMatch'
import {
  playCorrectSound,
  playIncorrectSound,
  playPartialSound,
  playSelectSound,
} from '../../utils/soundEffects'
import { vibrateSuccess, vibrateError, vibrateShort } from '../../utils/haptics'

// Phase 1: Rarity System
import QuestionRarityBadge from './engagement/QuestionRarityBadge'
import { selectRandomRarity, applyRarityMultiplier } from '../../hooks/game/rarityConfig'

// Phase 2: Boss Battle
import BossBattleIntro from './engagement/BossBattleIntro'
import BossBattle from './engagement/BossBattle'
import BossDefeated from './celebrations/BossDefeated'
import BossEscaped from './celebrations/BossEscaped'
import { BOSS_BATTLE_CONFIG } from '../../hooks/game/bossBattleConfig'

// Phase 6: Quick Wins
import DramaticPause from './engagement/DramaticPause'
import StreakFlames from './celebrations/StreakFlames'
import { QUICK_WINS } from '../../hooks/game/gameConfig'

/**
 * Question types supported by the quiz
 * @typedef {'mcq' | 'fill_blank' | 'true_false' | 'voice' | 'yes_no' | 'picture_match' | 'odd_one_out' | 'sort_groups' | 'find_error' | 'spot_it' | 'sequence' | 'apply_concept'} QuestionType
 */

/**
 * Question object structure
 * @typedef {Object} QuizQuestion
 * @property {string} id - Unique question identifier
 * @property {QuestionType} type - Question type
 * @property {string} question - Question text (for MCQ) or sentence with blank (for fill_blank)
 * @property {string[]} [options] - Answer options (MCQ only)
 * @property {number} [correctIndex] - Index of correct option (MCQ only)
 * @property {string|string[]} [correctAnswer] - Correct answer(s) (fill_blank only)
 * @property {string} [explanation] - Explanation shown after answering
 */

/**
 * Quiz result object
 * @typedef {Object} QuizResult
 * @property {string} questionId - Question ID
 * @property {boolean} isCorrect - Whether answer was correct
 * @property {boolean} isPartial - Whether answer was partially correct (fill_blank)
 * @property {number} similarity - Similarity score for fill_blank (0-1)
 * @property {*} userAnswer - User's answer
 * @property {*} correctAnswer - Correct answer
 */

// Quiz internal states
const QUIZ_STATE = {
  ANSWERING: 'answering',
  SHOWING_FEEDBACK: 'showing_feedback',
  COMPLETED: 'completed'
}

export default function Quiz({
  questions = [],
  slides = [],
  level = 'standard',
  hasSidebar = false,
  onComplete,
  onSkip
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState(QUIZ_STATE.ANSWERING)
  const [answers, setAnswers] = useState([])
  const [currentFeedback, setCurrentFeedback] = useState(null)
  const [timerActive, setTimerActive] = useState(true)

  // MicroCelebration state
  const [showMicroCelebration, setShowMicroCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState({ xpGained: 0, streak: 0 })

  // Phase 1: Rarity System - assign rarity to each question
  const [questionRarities, setQuestionRarities] = useState([])

  // Phase 2: Boss Battle - state machine for final question drama
  // Values: 'inactive' | 'intro' | 'active' | 'victory' | 'escaped'
  const [bossBattlePhase, setBossBattlePhase] = useState('inactive')
  const [bossResult, setBossResult] = useState(null)

  // Phase 6: Dramatic Pause - suspense before showing answer result
  const [showDramaticPause, setShowDramaticPause] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState(null)

  // Phase 6: Streak Flames - fire effects at streak milestones
  const [showStreakFlames, setShowStreakFlames] = useState(false)
  const [streakFlameIntensity, setStreakFlameIntensity] = useState('low')
  const streakFlamesTimeoutRef = useRef(null)

  // Initialize gamification system based on level
  const gamification = useQuizGamification(level)

  // Start timer when question changes
  useEffect(() => {
    if (state === QUIZ_STATE.ANSWERING) {
      gamification.startQuestionTimer()
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [currentIndex, state, gamification.startQuestionTimer])

  // Phase 1: Assign random rarity to each question on mount
  useEffect(() => {
    if (questions.length > 0 && questionRarities.length === 0) {
      const rarities = questions.map(() => selectRandomRarity())
      setQuestionRarities(rarities)
    }
  }, [questions, questionRarities.length])

  // Get current question's rarity
  const currentRarity = questionRarities[currentIndex] || 'common'

  // Total questions - defined early as it's used in multiple places
  const totalQuestions = questions.length

  // Current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null
  }, [questions, currentIndex])

  // Get slide image for current question based on slideReference
  const currentSlideImage = useMemo(() => {
    if (!currentQuestion || currentQuestion.slideReference === undefined) {
      return null
    }
    const slide = slides[currentQuestion.slideReference]
    return slide?.imageUrl || null
  }, [currentQuestion, slides])

  // Phase 2: Trigger boss battle intro on final question
  useEffect(() => {
    const isFinalQuestion = currentIndex === totalQuestions - 1
    const shouldShowBossIntro = isFinalQuestion &&
                                state === QUIZ_STATE.ANSWERING &&
                                bossBattlePhase === 'inactive' &&
                                totalQuestions > 1 // Only show boss for multi-question quizzes

    if (shouldShowBossIntro) {
      setBossBattlePhase('intro')
    }
  }, [currentIndex, totalQuestions, state, bossBattlePhase])

  // Clean up streak flames timeout on unmount
  useEffect(() => {
    return () => {
      if (streakFlamesTimeoutRef.current) {
        clearTimeout(streakFlamesTimeoutRef.current)
      }
    }
  }, [])

  // Calculate final results
  const calculateResults = useCallback(() => {
    const correctCount = answers.filter(a => a.isCorrect).length
    const partialCount = answers.filter(a => a.isPartial && !a.isCorrect).length
    const totalScore = answers.reduce((sum, a) => {
      if (a.isCorrect) return sum + 1
      if (a.isPartial) return sum + 0.5
      return sum
    }, 0)

    return {
      totalQuestions,
      correctCount,
      partialCount,
      incorrectCount: totalQuestions - correctCount - partialCount,
      score: totalScore,
      percentage: Math.round((totalScore / totalQuestions) * 100),
      answers
    }
  }, [answers, totalQuestions])

  /**
   * Play sound and haptic feedback based on answer result
   * Gracefully handles errors if audio/vibration not available
   */
  const playAnswerFeedback = useCallback((isCorrect, isPartial = false) => {
    try {
      if (isCorrect) {
        playCorrectSound()
        vibrateSuccess()
      } else if (isPartial) {
        playPartialSound()
        vibrateSuccess() // Partial is still positive
      } else {
        playIncorrectSound()
        vibrateError()
      }
    } catch {
      // Silently ignore audio/haptic errors
    }
  }, [])

  /**
   * Play select sound and short haptic when user selects an option
   * Called by question components when user taps an option
   */
  const handleOptionSelect = useCallback(() => {
    try {
      playSelectSound()
      vibrateShort()
    } catch {
      // Silently ignore audio/haptic errors
    }
  }, [])

  /**
   * Trigger MicroCelebration for correct answers
   */
  const triggerCelebration = useCallback((xpGained, streak) => {
    setCelebrationData({ xpGained, streak })
    setShowMicroCelebration(true)
  }, [])

  /**
   * Handle MicroCelebration completion
   */
  const handleCelebrationComplete = useCallback(() => {
    setShowMicroCelebration(false)
  }, [])

  /**
   * Phase 2: Handle boss battle intro completion
   * Transitions from intro animation to active boss battle
   */
  const handleBossIntroComplete = useCallback(() => {
    setBossBattlePhase('active')
  }, [])

  /**
   * Phase 2: Handle boss victory celebration completion
   * Proceeds to show normal feedback after victory animation
   */
  const handleBossVictoryComplete = useCallback(() => {
    setBossBattlePhase('inactive')
    // Show the feedback that was pending during boss celebration
    if (pendingFeedback) {
      setCurrentFeedback(pendingFeedback)
      setState(QUIZ_STATE.SHOWING_FEEDBACK)
      setPendingFeedback(null)
    }
  }, [pendingFeedback])

  /**
   * Phase 2: Handle boss escaped (defeat) completion
   * Proceeds to show normal feedback after escape animation
   */
  const handleBossEscapedComplete = useCallback(() => {
    setBossBattlePhase('inactive')
    // Show the feedback that was pending during boss celebration
    if (pendingFeedback) {
      setCurrentFeedback(pendingFeedback)
      setState(QUIZ_STATE.SHOWING_FEEDBACK)
      setPendingFeedback(null)
    }
  }, [pendingFeedback])

  /**
   * Phase 6: Handle dramatic pause completion
   * Shows the feedback after suspense animation
   */
  const handleDramaticPauseComplete = useCallback(() => {
    setShowDramaticPause(false)
    if (pendingFeedback) {
      // Check if this is boss battle final question
      const isFinalQuestion = currentIndex === totalQuestions - 1
      if (isFinalQuestion && bossBattlePhase === 'active') {
        // Show boss victory or escape instead of immediate feedback
        if (pendingFeedback.isCorrect) {
          setBossResult({ defeated: true, xpBonus: BOSS_BATTLE_CONFIG.rewards.victoryXpBonus })
          setBossBattlePhase('victory')
        } else {
          setBossResult({ defeated: false })
          setBossBattlePhase('escaped')
        }
        // Don't clear pendingFeedback yet - boss handlers will do it
      } else {
        // Normal question - show feedback immediately
        setCurrentFeedback(pendingFeedback)
        setState(QUIZ_STATE.SHOWING_FEEDBACK)
        setPendingFeedback(null)
      }
    }
  }, [pendingFeedback, currentIndex, totalQuestions, bossBattlePhase])

  /**
   * Phase 6: Trigger streak flames at milestones
   * Shows fire effects on screen edges for streak achievements
   */
  const triggerStreakFlames = useCallback((streak) => {
    const milestone = QUICK_WINS.streakMilestones.find(m => streak === m)
    if (milestone) {
      const intensity = QUICK_WINS.flameIntensity[milestone] || 'low'
      setStreakFlameIntensity(intensity)
      setShowStreakFlames(true)

      // Auto-hide after 2 seconds
      if (streakFlamesTimeoutRef.current) {
        clearTimeout(streakFlamesTimeoutRef.current)
      }
      streakFlamesTimeoutRef.current = setTimeout(() => {
        setShowStreakFlames(false)
      }, 2000)
    }
  }, [])

  // Handle MCQ answer
  const handleMCQAnswer = useCallback((selectedIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'mcq') return

    const isCorrect = selectedIndex === currentQuestion.correctIndex

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, false)

    // Trigger celebration for correct answers
    if (isCorrect) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      // Phase 6: Check for streak milestone
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedIndex,
      correctAnswer: currentQuestion.correctIndex,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Fill-in-blank answer
  const handleFillBlankAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'fill_blank') return

    // Use fuzzy matching to evaluate the answer
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.95, // Allow for minor typos
      partialThreshold: 0.75, // Partial credit for close answers
      minSimilarity: 0.5
    })

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(matchResult.isCorrect, matchResult.isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(matchResult.isCorrect, matchResult.isPartial)

    // Trigger celebration for correct/partial answers
    if (matchResult.isCorrect || matchResult.isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect: matchResult.isCorrect,
      isPartial: matchResult.isPartial,
      similarity: matchResult.similarity,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: Array.isArray(currentQuestion.correctAnswer)
        ? currentQuestion.correctAnswer[0]
        : currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Voice answer
  // Voice answers are evaluated semantically: user's response should cover expectedTopics
  const handleVoiceAnswer = useCallback((userTranscript) => {
    if (!currentQuestion || currentQuestion.type !== 'voice') return

    const expectedTopics = currentQuestion.expectedTopics || []
    const correctAnswer = currentQuestion.correctAnswer || currentQuestion.sampleAnswer || ''

    // Count how many expected topics are mentioned in the user's answer
    // Uses case-insensitive substring matching for semantic evaluation
    const normalizedTranscript = userTranscript.toLowerCase()
    let topicsMatched = 0

    for (const topic of expectedTopics) {
      if (normalizedTranscript.includes(topic.toLowerCase())) {
        topicsMatched++
      }
    }

    // Determine correctness based on topic coverage
    // Correct if majority of topics are covered (>= 50%)
    // Partial credit if at least one topic is mentioned
    const totalTopics = expectedTopics.length
    let isCorrect = false
    let isPartial = false

    if (totalTopics > 0) {
      const coverage = topicsMatched / totalTopics
      if (coverage >= 0.5) {
        isCorrect = true
      } else if (topicsMatched > 0) {
        isPartial = true
      }
    } else {
      // Fallback: if no expectedTopics, use fuzzy match against correctAnswer
      const matchResult = fuzzyMatch(userTranscript, correctAnswer, {
        exactThreshold: 0.7, // More lenient for spoken answers
        partialThreshold: 0.5,
        minSimilarity: 0.3
      })
      isCorrect = matchResult.isCorrect
      isPartial = matchResult.isPartial
    }

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, isPartial)

    // Trigger celebration for correct/partial answers
    if (isCorrect || isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial,
      similarity: totalTopics > 0 ? topicsMatched / totalTopics : 0,
      questionId: currentQuestion.id,
      userAnswer: userTranscript,
      correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Yes/No answer
  // yes_no type expects a boolean answer (true/false)
  const handleYesNoAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'yes_no') return

    const isCorrect = userAnswer === currentQuestion.correctAnswer

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, false)

    // Trigger celebration for correct answers
    if (isCorrect) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Picture Match answer
  // picture_match type expects a slide index selection
  const handlePictureMatchAnswer = useCallback((selectedSlideIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'picture_match') return

    const isCorrect = selectedSlideIndex === currentQuestion.correctSlideIndex

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, false)

    // Trigger celebration for correct answers
    if (isCorrect) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedSlideIndex,
      correctAnswer: currentQuestion.correctSlideIndex,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Odd One Out answer
  // odd_one_out type expects the index of the item user selected
  const handleOddOneOutAnswer = useCallback((selectedIndex) => {
    if (!currentQuestion || currentQuestion.type !== 'odd_one_out') return

    // Find the correct answer (the odd item)
    const correctIndex = currentQuestion.items?.findIndex(item => item.isOdd) ?? -1
    const isCorrect = selectedIndex === correctIndex

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, false)

    // Trigger celebration for correct answers
    if (isCorrect) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: selectedIndex,
      correctAnswer: correctIndex,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Sort Groups answer
  // sort_groups type expects an object mapping group names to arrays of items
  const handleSortGroupsAnswer = useCallback((userSorting) => {
    if (!currentQuestion || currentQuestion.type !== 'sort_groups') return

    const correctSorting = currentQuestion.correctSorting || {}
    let isCorrect = true
    let correctCount = 0
    let totalItems = 0

    // Check if each item is in the correct group
    Object.keys(correctSorting).forEach(groupName => {
      const correctItems = correctSorting[groupName] || []
      const userItems = userSorting[groupName] || []

      correctItems.forEach(item => {
        totalItems++
        if (userItems.includes(item)) {
          correctCount++
        } else {
          isCorrect = false
        }
      })

      // Also check if user put any wrong items in this group
      userItems.forEach(item => {
        if (!correctItems.includes(item)) {
          isCorrect = false
        }
      })
    })

    // Partial credit if at least half are correct
    const isPartial = !isCorrect && correctCount >= totalItems / 2
    const similarity = totalItems > 0 ? correctCount / totalItems : 0

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, isPartial)

    // Trigger celebration for correct/partial answers
    if (isCorrect || isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial,
      similarity,
      questionId: currentQuestion.id,
      userAnswer: userSorting,
      correctAnswer: correctSorting,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Find Error answer
  // find_error type expects text input describing the error
  const handleFindErrorAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'find_error') return

    // Use fuzzy matching to evaluate the answer
    const matchResult = fuzzyMatch(userAnswer, currentQuestion.correctAnswer, {
      exactThreshold: 0.85, // Allow for different wording
      partialThreshold: 0.6, // Partial credit for related answers
      minSimilarity: 0.4
    })

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(matchResult.isCorrect, matchResult.isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(matchResult.isCorrect, matchResult.isPartial)

    // Trigger celebration for correct/partial answers
    if (matchResult.isCorrect || matchResult.isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect: matchResult.isCorrect,
      isPartial: matchResult.isPartial,
      similarity: matchResult.similarity,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: Array.isArray(currentQuestion.correctAnswer)
        ? currentQuestion.correctAnswer[0]
        : currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Spot It answer
  // spot_it type expects {x, y} coordinates where user tapped on the image
  const handleSpotItAnswer = useCallback((coordinates) => {
    if (!currentQuestion || currentQuestion.type !== 'spot_it') return

    // Check if user's tap is within the target area
    // Target area is defined by correctArea: { x, y, radius } or { x, y, width, height }
    const targetArea = currentQuestion.correctArea
    let isCorrect = false

    if (targetArea) {
      const dx = coordinates.x - targetArea.x
      const dy = coordinates.y - targetArea.y

      if (targetArea.radius) {
        // Circular target area
        const distance = Math.sqrt(dx * dx + dy * dy)
        isCorrect = distance <= targetArea.radius
      } else if (targetArea.width && targetArea.height) {
        // Rectangular target area
        isCorrect = Math.abs(dx) <= targetArea.width / 2 &&
                    Math.abs(dy) <= targetArea.height / 2
      }
    }

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, false)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, false)

    // Trigger celebration for correct answers
    if (isCorrect) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial: false,
      similarity: isCorrect ? 1 : 0,
      questionId: currentQuestion.id,
      userAnswer: coordinates,
      correctAnswer: targetArea,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Sequence answer
  // sequence type expects an array of indices representing the order
  const handleSequenceAnswer = useCallback((userSequence) => {
    if (!currentQuestion || currentQuestion.type !== 'sequence') return

    const correctSequence = currentQuestion.correctSequence
    let isCorrect = false
    let isPartial = false
    let correctCount = 0

    if (Array.isArray(userSequence) && Array.isArray(correctSequence)) {
      // Check exact match first
      isCorrect = userSequence.length === correctSequence.length &&
                  userSequence.every((val, idx) => val === correctSequence[idx])

      // If not exact match, check for partial credit
      if (!isCorrect) {
        // Count positions that are correct
        const minLength = Math.min(userSequence.length, correctSequence.length)
        for (let i = 0; i < minLength; i++) {
          if (userSequence[i] === correctSequence[i]) {
            correctCount++
          }
        }
        // Partial credit if at least half are in correct position
        isPartial = correctCount >= correctSequence.length / 2
      }
    }

    const similarity = correctSequence.length > 0
      ? (isCorrect ? 1 : correctCount / correctSequence.length)
      : 0

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, isPartial)

    // Trigger celebration for correct/partial answers
    if (isCorrect || isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial,
      similarity,
      questionId: currentQuestion.id,
      userAnswer: userSequence,
      correctAnswer: correctSequence,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle Apply Concept answer
  // apply_concept type expects text input applying a concept to a new scenario
  const handleApplyConceptAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || currentQuestion.type !== 'apply_concept') return

    // Check against expected key points in the answer
    const expectedKeyPoints = currentQuestion.expectedKeyPoints || []
    const correctAnswer = currentQuestion.correctAnswer || currentQuestion.sampleAnswer || ''

    let isCorrect = false
    let isPartial = false
    let keyPointsMatched = 0

    const normalizedAnswer = userAnswer.toLowerCase()

    if (expectedKeyPoints.length > 0) {
      // Check how many key points are mentioned in the answer
      for (const keyPoint of expectedKeyPoints) {
        if (normalizedAnswer.includes(keyPoint.toLowerCase())) {
          keyPointsMatched++
        }
      }

      // Correct if majority of key points are covered
      const coverage = keyPointsMatched / expectedKeyPoints.length
      if (coverage >= 0.6) {
        isCorrect = true
      } else if (keyPointsMatched > 0) {
        isPartial = true
      }
    } else {
      // Fallback to fuzzy matching if no expectedKeyPoints defined
      const matchResult = fuzzyMatch(userAnswer, correctAnswer, {
        exactThreshold: 0.75,
        partialThreshold: 0.5,
        minSimilarity: 0.3
      })
      isCorrect = matchResult.isCorrect
      isPartial = matchResult.isPartial
    }

    // Record answer with gamification
    const gamificationResult = gamification.recordAnswer(isCorrect, isPartial)

    // Phase 1: Apply rarity multiplier to XP
    const rarityMultipliedXp = applyRarityMultiplier(gamificationResult.xpGained, currentRarity)

    // Play sound and haptic feedback
    playAnswerFeedback(isCorrect, isPartial)

    // Trigger celebration for correct/partial answers
    if (isCorrect || isPartial) {
      triggerCelebration(rarityMultipliedXp, gamificationResult.newStreak)
      triggerStreakFlames(gamificationResult.newStreak)
    }

    const feedback = {
      isCorrect,
      isPartial,
      similarity: expectedKeyPoints.length > 0
        ? keyPointsMatched / expectedKeyPoints.length
        : 0,
      questionId: currentQuestion.id,
      userAnswer,
      correctAnswer: Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer,
      explanation: currentQuestion.explanation,
      xpGained: rarityMultipliedXp,
      speedBonus: gamificationResult.speedBonus,
      rarity: currentRarity
    }

    // Phase 6: Use dramatic pause before showing feedback
    setPendingFeedback(feedback)
    setShowDramaticPause(true)
  }, [currentQuestion, gamification, playAnswerFeedback, triggerCelebration, currentRarity, triggerStreakFlames])

  // Handle continue after feedback
  const handleContinue = useCallback(() => {
    // Save the answer
    setAnswers(prev => [...prev, currentFeedback])

    // Move to next question or complete
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentFeedback(null)
      setState(QUIZ_STATE.ANSWERING)
    } else {
      setState(QUIZ_STATE.COMPLETED)
      // Calculate and return results
      const finalAnswers = [...answers, currentFeedback]
      const correctCount = finalAnswers.filter(a => a.isCorrect).length
      const partialCount = finalAnswers.filter(a => a.isPartial && !a.isCorrect).length
      const totalScore = finalAnswers.reduce((sum, a) => {
        if (a.isCorrect) return sum + 1
        if (a.isPartial) return sum + 0.5
        return sum
      }, 0)

      // Calculate gamification results
      const gamificationResults = gamification.calculateFinalResults(correctCount, totalQuestions)

      onComplete?.({
        totalQuestions,
        correctCount,
        partialCount,
        incorrectCount: totalQuestions - correctCount - partialCount,
        score: totalScore,
        percentage: Math.round((totalScore / totalQuestions) * 100),
        answers: finalAnswers,
        questions,
        // Gamification data
        level,
        ...gamificationResults,
        // Phase 2: Boss battle result
        bossVictory: bossResult?.defeated || false
      })
    }
  }, [currentFeedback, currentIndex, totalQuestions, answers, onComplete, gamification, level, bossResult])

  // Handle skip quiz
  const handleSkip = useCallback(() => {
    onSkip?.()
  }, [onSkip])

  // Guard: No questions
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No quiz questions available.</p>
      </div>
    )
  }

  // Guard: Quiz completed
  if (state === QUIZ_STATE.COMPLETED) {
    return null // Parent component handles completion UI
  }

  // Determine if current question is the boss battle question
  const isBossQuestion = currentIndex === totalQuestions - 1 && totalQuestions > 1

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 relative">
      {/* Phase 2: Boss Battle Full-Screen Overlays */}
      {bossBattlePhase === 'intro' && (
        <BossBattleIntro level={level} onComplete={handleBossIntroComplete} />
      )}
      <BossDefeated
        level={level}
        xpBonus={bossResult?.xpBonus || BOSS_BATTLE_CONFIG.rewards.victoryXpBonus}
        show={bossBattlePhase === 'victory'}
        onComplete={handleBossVictoryComplete}
      />
      <BossEscaped
        level={level}
        show={bossBattlePhase === 'escaped'}
        onComplete={handleBossEscapedComplete}
      />

      {/* Phase 6: Dramatic Pause Overlay */}
      <DramaticPause
        show={showDramaticPause}
        level={level}
        onComplete={handleDramaticPauseComplete}
      />

      {/* Phase 6: Streak Flames Overlay */}
      <StreakFlames
        streak={gamification.streak}
        intensity={streakFlameIntensity}
        show={showStreakFlames}
        position="both"
      />

      {/* Streak Celebration Overlay (legacy - keeps centered card at milestones) */}
      <StreakCelebration
        streak={gamification.streak}
        celebrationStyle={gamification.rules.celebrationStyle}
        show={gamification.showStreakCelebration}
      />

      {/* MicroCelebration Overlay - shows on correct answer */}
      <MicroCelebration
        isActive={showMicroCelebration}
        xpGained={celebrationData.xpGained}
        streak={celebrationData.streak}
        onComplete={handleCelebrationComplete}
      />

      {/* Combo Indicator - Top right corner */}
      <ComboIndicator
        multiplier={gamification.currentMultiplier}
        comboLevel={gamification.comboLevel}
        showComboUp={gamification.showComboUp}
        celebrationStyle={gamification.rules.celebrationStyle}
      />

      {/* Quiz Timer - Top left corner */}
      <QuizTimer
        isActive={timerActive}
        speedThreshold={gamification.rules.speedThreshold}
        level={level}
        hasSidebar={hasSidebar}
      />

      {/* Skip button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleSkip}
          className="
            text-sm text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
          "
        >
          Skip Quiz
        </button>
      </div>

      {/* Progress indicator with rarity badge */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <QuizProgress
          current={currentIndex + 1}
          total={totalQuestions}
          questionType={currentQuestion?.type || 'mcq'}
        />
        {/* Phase 1: Rarity Badge - only shows for non-common rarities */}
        <QuestionRarityBadge
          rarity={currentRarity}
          variant="badge"
          showMultiplier={true}
          animate={state === QUIZ_STATE.ANSWERING}
        />
      </div>

      {/* Question display - wrapped in BossBattle for final question */}
      <BossBattle level={level} isActive={isBossQuestion && bossBattlePhase === 'active'}>
        <div className="min-h-[300px]">
        {/* Slide preview - shows diagram from learning content */}
        {currentSlideImage && (
          <div className="mb-4 flex justify-center">
            <QuizSlidePreview
              imageUrl={currentSlideImage}
              alt={`Diagram for question ${currentIndex + 1}`}
            />
          </div>
        )}

        {/* MCQ Question */}
        {currentQuestion?.type === 'mcq' && state === QUIZ_STATE.ANSWERING && (
          <MCQQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            options={currentQuestion.options}
            onAnswer={handleMCQAnswer}
            onOptionSelect={handleOptionSelect}
            showFeedback={false}
            correctIndex={currentQuestion.correctIndex}
            selectedIndex={null}
          />
        )}

        {/* MCQ with feedback */}
        {currentQuestion?.type === 'mcq' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <MCQQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              options={currentQuestion.options}
              onAnswer={() => {}}
              showFeedback={true}
              correctIndex={currentQuestion.correctIndex}
              selectedIndex={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              correctAnswer={currentQuestion.options?.[currentQuestion.correctIndex]}
              userAnswer={currentQuestion.options?.[currentFeedback.userAnswer]}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Fill-in-blank Question */}
        {currentQuestion?.type === 'fill_blank' && state === QUIZ_STATE.ANSWERING && (
          <FillBlankQuestion
            key={currentQuestion.id}
            blankSentence={currentQuestion.blankSentence || currentQuestion.question}
            wordOptions={currentQuestion.wordOptions || []}
            onAnswer={handleFillBlankAnswer}
            showFeedback={false}
            correctAnswer={
              Array.isArray(currentQuestion.correctAnswer)
                ? currentQuestion.correctAnswer[0]
                : currentQuestion.correctAnswer
            }
          />
        )}

        {/* Fill-in-blank with feedback */}
        {currentQuestion?.type === 'fill_blank' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <FillBlankQuestion
              key={`${currentQuestion.id}-feedback`}
              blankSentence={currentQuestion.blankSentence || currentQuestion.question}
              wordOptions={currentQuestion.wordOptions || []}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              similarity={currentFeedback.similarity}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Voice Question */}
        {currentQuestion?.type === 'voice' && state === QUIZ_STATE.ANSWERING && (
          <VoiceQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            expectedTopics={currentQuestion.expectedTopics}
            sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
            onAnswer={handleVoiceAnswer}
            showFeedback={false}
          />
        )}

        {/* Voice with feedback */}
        {currentQuestion?.type === 'voice' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <VoiceQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              expectedTopics={currentQuestion.expectedTopics}
              sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
              onAnswer={() => {}}
              showFeedback={true}
              feedback={{
                correct: currentFeedback.isCorrect,
                explanation: currentQuestion.explanation
              }}
              userTranscript={currentFeedback.userAnswer}
              correctAnswer={currentFeedback.correctAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Yes/No Question */}
        {currentQuestion?.type === 'yes_no' && state === QUIZ_STATE.ANSWERING && (
          <YesNoQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            statement={currentQuestion.statement}
            hint={currentQuestion.hint}
            onAnswer={handleYesNoAnswer}
            showFeedback={false}
            correctAnswer={currentQuestion.correctAnswer}
          />
        )}

        {/* Yes/No with feedback */}
        {currentQuestion?.type === 'yes_no' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <YesNoQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              statement={currentQuestion.statement}
              hint={currentQuestion.hint}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentQuestion.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer ? 'True' : 'False'}
              userAnswer={currentFeedback.userAnswer ? 'True' : 'False'}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Picture Match Question */}
        {currentQuestion?.type === 'picture_match' && state === QUIZ_STATE.ANSWERING && (
          <PictureMatchQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            imageOptions={currentQuestion.imageOptions}
            slides={slides}
            onAnswer={handlePictureMatchAnswer}
            showFeedback={false}
            correctSlideIndex={currentQuestion.correctSlideIndex}
          />
        )}

        {/* Picture Match with feedback */}
        {currentQuestion?.type === 'picture_match' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <PictureMatchQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              imageOptions={currentQuestion.imageOptions}
              slides={slides}
              onAnswer={() => {}}
              showFeedback={true}
              correctSlideIndex={currentQuestion.correctSlideIndex}
              userAnswer={currentFeedback.userAnswer}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Odd One Out Question */}
        {currentQuestion?.type === 'odd_one_out' && state === QUIZ_STATE.ANSWERING && (
          <OddOneOutQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            items={currentQuestion.items}
            onAnswer={handleOddOneOutAnswer}
            showFeedback={false}
            explanation={currentQuestion.explanation}
          />
        )}

        {/* Odd One Out with feedback */}
        {currentQuestion?.type === 'odd_one_out' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <OddOneOutQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              items={currentQuestion.items}
              onAnswer={() => {}}
              showFeedback={true}
              userAnswer={currentFeedback.userAnswer}
              explanation={currentQuestion.explanation}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Sort Groups Question */}
        {currentQuestion?.type === 'sort_groups' && state === QUIZ_STATE.ANSWERING && (
          <SortGroupsQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            items={currentQuestion.items}
            groups={currentQuestion.groups}
            correctSorting={currentQuestion.correctSorting}
            onAnswer={handleSortGroupsAnswer}
            showFeedback={false}
            explanation={currentQuestion.explanation}
          />
        )}

        {/* Sort Groups with feedback */}
        {currentQuestion?.type === 'sort_groups' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <SortGroupsQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              items={currentQuestion.items}
              groups={currentQuestion.groups}
              correctSorting={currentQuestion.correctSorting}
              onAnswer={() => {}}
              showFeedback={true}
              userAnswer={currentFeedback.userAnswer}
              explanation={currentQuestion.explanation}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Find Error Question */}
        {currentQuestion?.type === 'find_error' && state === QUIZ_STATE.ANSWERING && (
          <FindErrorQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            incorrectStatement={currentQuestion.incorrectStatement}
            onAnswer={handleFindErrorAnswer}
            showFeedback={false}
            correctAnswer={
              Array.isArray(currentQuestion.correctAnswer)
                ? currentQuestion.correctAnswer[0]
                : currentQuestion.correctAnswer
            }
          />
        )}

        {/* Find Error with feedback */}
        {currentQuestion?.type === 'find_error' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <FindErrorQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              incorrectStatement={currentQuestion.incorrectStatement}
              onAnswer={() => {}}
              showFeedback={true}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Spot It Question */}
        {currentQuestion?.type === 'spot_it' && state === QUIZ_STATE.ANSWERING && (
          <SpotItQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            imageUrl={currentSlideImage}
            hint={currentQuestion.hint}
            onAnswer={handleSpotItAnswer}
            showFeedback={false}
            correctArea={currentQuestion.correctArea}
          />
        )}

        {/* Spot It with feedback */}
        {currentQuestion?.type === 'spot_it' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <SpotItQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              imageUrl={currentSlideImage}
              hint={currentQuestion.hint}
              onAnswer={() => {}}
              showFeedback={true}
              correctArea={currentQuestion.correctArea}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Sequence Question */}
        {currentQuestion?.type === 'sequence' && state === QUIZ_STATE.ANSWERING && (
          <SequenceQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            items={currentQuestion.items}
            onAnswer={handleSequenceAnswer}
            showFeedback={false}
            correctSequence={currentQuestion.correctSequence}
          />
        )}

        {/* Sequence with feedback */}
        {currentQuestion?.type === 'sequence' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <SequenceQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              items={currentQuestion.items}
              onAnswer={() => {}}
              showFeedback={true}
              correctSequence={currentQuestion.correctSequence}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              onContinue={handleContinue}
            />
          </div>
        )}

        {/* Apply Concept Question */}
        {currentQuestion?.type === 'apply_concept' && state === QUIZ_STATE.ANSWERING && (
          <ApplyConceptQuestion
            key={currentQuestion.id}
            question={currentQuestion.question}
            scenario={currentQuestion.scenario}
            concept={currentQuestion.concept}
            expectedKeyPoints={currentQuestion.expectedKeyPoints}
            onAnswer={handleApplyConceptAnswer}
            showFeedback={false}
            sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
          />
        )}

        {/* Apply Concept with feedback */}
        {currentQuestion?.type === 'apply_concept' && state === QUIZ_STATE.SHOWING_FEEDBACK && currentFeedback && (
          <div className="space-y-6">
            <ApplyConceptQuestion
              key={`${currentQuestion.id}-feedback`}
              question={currentQuestion.question}
              scenario={currentQuestion.scenario}
              concept={currentQuestion.concept}
              expectedKeyPoints={currentQuestion.expectedKeyPoints}
              onAnswer={() => {}}
              showFeedback={true}
              sampleAnswer={currentQuestion.sampleAnswer || currentQuestion.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
            />
            <QuizFeedback
              isCorrect={currentFeedback.isCorrect}
              isPartial={currentFeedback.isPartial}
              explanation={currentQuestion.explanation}
              correctAnswer={currentFeedback.correctAnswer}
              userAnswer={currentFeedback.userAnswer}
              onContinue={handleContinue}
            />
          </div>
        )}
        </div>
      </BossBattle>
    </div>
  )
}

// Note: Sub-components are used internally only - no external re-exports needed
