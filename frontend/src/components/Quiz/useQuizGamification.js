/**
 * useQuizGamification - Hook for streak tracking, combo multipliers, and XP calculation
 *
 * Provides game-like feedback that adapts to the explanation level:
 * - Simple: Gentle, encouraging, no time pressure
 * - Standard: Balanced challenge with streaks
 * - Deep: Full challenge mode with speed bonuses
 */
import { useState, useCallback, useRef, useMemo } from 'react'

// Level-specific gamification rules
const GAMIFICATION_RULES = {
  simple: {
    baseXpPerCorrect: 3,
    passBonus: 5,
    perfectBonus: 5,
    streakThresholds: [2, 4],     // Combo at 2, 4 correct in a row
    multipliers: [1, 1.25, 1.5],  // Gentle multipliers
    speedBonusEnabled: false,
    speedThreshold: null,
    hintsAllowed: 3,
    attemptsPerQuestion: 2,
    celebrationStyle: 'playful'   // Stars, rainbows, bouncy
  },
  standard: {
    baseXpPerCorrect: 5,
    passBonus: 10,
    perfectBonus: 15,
    streakThresholds: [3, 5],
    multipliers: [1, 1.5, 2],
    speedBonusEnabled: true,
    speedThreshold: 15,           // seconds for speed bonus
    hintsAllowed: 1,
    attemptsPerQuestion: 1,
    celebrationStyle: 'balanced'  // Confetti, badges
  },
  deep: {
    baseXpPerCorrect: 8,
    passBonus: 20,
    perfectBonus: 30,
    streakThresholds: [3, 5],
    multipliers: [1, 1.5, 2],
    speedBonusEnabled: true,
    speedThreshold: 10,           // seconds for speed bonus
    hintsAllowed: 0,
    attemptsPerQuestion: 1,
    celebrationStyle: 'intense'   // Fire, lightning, dramatic
  }
}

/**
 * @param {string} level - Explanation level: 'simple', 'standard', or 'deep'
 * @returns {Object} Gamification state and methods
 */
export default function useQuizGamification(level = 'standard') {
  const rules = useMemo(() => GAMIFICATION_RULES[level] || GAMIFICATION_RULES.standard, [level])

  // Core state
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [comboLevel, setComboLevel] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [speedBonuses, setSpeedBonuses] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)

  // Track question timing
  const questionStartTime = useRef(null)
  const questionTimes = useRef([])

  // Celebration triggers
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [showComboUp, setShowComboUp] = useState(false)
  const [lastXpGain, setLastXpGain] = useState(null)

  // Start timing for current question
  const startQuestionTimer = useCallback(() => {
    questionStartTime.current = Date.now()
  }, [])

  // Calculate current multiplier based on combo level
  const getCurrentMultiplier = useCallback(() => {
    return rules.multipliers[Math.min(comboLevel, rules.multipliers.length - 1)]
  }, [comboLevel, rules.multipliers])

  // Check if answer qualifies for speed bonus
  const checkSpeedBonus = useCallback(() => {
    if (!rules.speedBonusEnabled || !questionStartTime.current) return false
    const elapsed = (Date.now() - questionStartTime.current) / 1000
    questionTimes.current.push(elapsed)
    return elapsed <= rules.speedThreshold
  }, [rules.speedBonusEnabled, rules.speedThreshold])

  // Record an answer and update gamification state
  const recordAnswer = useCallback((isCorrect, isPartial = false) => {
    const multiplier = getCurrentMultiplier()
    const gotSpeedBonus = checkSpeedBonus()

    let xpGained = 0
    let newStreak = streak
    let newComboLevel = comboLevel

    if (isCorrect) {
      // Base XP with multiplier
      xpGained = Math.round(rules.baseXpPerCorrect * multiplier)

      // Speed bonus (extra 50% for quick answers)
      if (gotSpeedBonus) {
        const speedBonus = Math.round(rules.baseXpPerCorrect * 0.5)
        xpGained += speedBonus
        setSpeedBonuses(prev => prev + 1)
      }

      // Partial credit gets 50% XP
      if (isPartial) {
        xpGained = Math.round(xpGained * 0.5)
      }

      // Update streak
      newStreak = streak + 1
      setStreak(newStreak)
      setMaxStreak(prev => Math.max(prev, newStreak))

      // Check for combo level up
      const newCombo = rules.streakThresholds.filter(t => newStreak >= t).length
      if (newCombo > comboLevel) {
        newComboLevel = newCombo
        setComboLevel(newCombo)
        setShowComboUp(true)
        setTimeout(() => setShowComboUp(false), 2000)
      }

      // Trigger streak celebration at thresholds
      if (rules.streakThresholds.includes(newStreak)) {
        setShowStreakCelebration(true)
        setTimeout(() => setShowStreakCelebration(false), 2500)
      }
    } else {
      // Wrong answer breaks streak
      newStreak = 0
      newComboLevel = 0
      setStreak(0)
      setComboLevel(0)
    }

    // Update total XP
    setTotalXp(prev => prev + xpGained)
    setLastXpGain({
      amount: xpGained,
      multiplier,
      speedBonus: gotSpeedBonus,
      isPartial
    })

    return {
      xpGained,
      multiplier,
      speedBonus: gotSpeedBonus,
      newStreak,
      comboLevel: newComboLevel
    }
  }, [streak, comboLevel, rules, getCurrentMultiplier, checkSpeedBonus])

  // Use a hint (if available)
  const useHint = useCallback(() => {
    if (hintsUsed < rules.hintsAllowed) {
      setHintsUsed(prev => prev + 1)
      return true
    }
    return false
  }, [hintsUsed, rules.hintsAllowed])

  // Calculate final results
  const calculateFinalResults = useCallback((correctCount, totalQuestions) => {
    const percentage = Math.round((correctCount / totalQuestions) * 100)
    const passThreshold = level === 'simple' ? 50 : level === 'deep' ? 75 : 60
    const passed = percentage >= passThreshold

    // Add bonuses
    let finalXp = totalXp
    if (passed) {
      finalXp += rules.passBonus
    }
    if (percentage === 100) {
      finalXp += rules.perfectBonus
    }

    // Calculate star rating for simple level
    let stars = 0
    if (percentage >= 90) stars = 3
    else if (percentage >= 70) stars = 2
    else if (percentage >= 50) stars = 1

    // Average answer time
    const avgTime = questionTimes.current.length > 0
      ? questionTimes.current.reduce((a, b) => a + b, 0) / questionTimes.current.length
      : null

    return {
      totalXp: finalXp,
      baseXp: totalXp,
      passBonus: passed ? rules.passBonus : 0,
      perfectBonus: percentage === 100 ? rules.perfectBonus : 0,
      percentage,
      passed,
      maxStreak,
      speedBonuses,
      stars,
      avgTime: avgTime ? Math.round(avgTime * 10) / 10 : null,
      hintsUsed,
      celebrationStyle: rules.celebrationStyle
    }
  }, [totalXp, maxStreak, speedBonuses, hintsUsed, level, rules])

  // Reset for new quiz
  const resetGamification = useCallback(() => {
    setStreak(0)
    setMaxStreak(0)
    setComboLevel(0)
    setTotalXp(0)
    setSpeedBonuses(0)
    setHintsUsed(0)
    setShowStreakCelebration(false)
    setShowComboUp(false)
    setLastXpGain(null)
    questionStartTime.current = null
    questionTimes.current = []
  }, [])

  return {
    // State
    streak,
    maxStreak,
    comboLevel,
    totalXp,
    hintsRemaining: rules.hintsAllowed - hintsUsed,

    // Computed
    currentMultiplier: getCurrentMultiplier(),
    rules,

    // Celebration triggers
    showStreakCelebration,
    showComboUp,
    lastXpGain,

    // Methods
    startQuestionTimer,
    recordAnswer,
    useHint,
    calculateFinalResults,
    resetGamification
  }
}
