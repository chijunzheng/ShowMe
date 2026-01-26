/**
 * LevelUpModal Component
 * v2.0: Celebratory modal for level up achievements
 * Shows when user reaches a new level
 */

import { useEffect, useState } from 'react'
import Confetti from './Confetti'
import { playAchievementSound } from '../utils/soundEffects'

// Level tier colors
const LEVEL_COLORS = {
  Curious: 'from-emerald-400 to-teal-500',
  Explorer: 'from-blue-400 to-indigo-500',
  Scholar: 'from-purple-400 to-violet-500',
  Expert: 'from-amber-400 to-orange-500',
  Master: 'from-rose-400 to-red-500'
}

// Level tier icons
const LEVEL_ICONS = {
  Curious: '🌱',
  Explorer: '🧭',
  Scholar: '📚',
  Expert: '🎯',
  Master: '👑'
}

export default function LevelUpModal({
  levelInfo,
  isOpen,
  onClose
}) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && levelInfo) {
      // Play celebration sound
      playAchievementSound()
      // Show confetti
      setShowConfetti(true)
    }
  }, [isOpen, levelInfo])

  if (!isOpen || !levelInfo) return null

  const tierColor = LEVEL_COLORS[levelInfo.name] || LEVEL_COLORS.Curious
  const tierIcon = LEVEL_ICONS[levelInfo.name] || '🌟'

  return (
    <>
      <Confetti
        isActive={showConfetti}
        duration={4000}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        {/* Modal content */}
        <div
          className="
            relative mx-4 p-8 rounded-3xl
            bg-white dark:bg-slate-800
            shadow-2xl
            animate-bounce-in
            max-w-sm w-full text-center
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Level badge */}
          <div
            className={`
              mx-auto w-24 h-24 rounded-full
              bg-gradient-to-br ${tierColor}
              flex items-center justify-center
              shadow-lg mb-4
              animate-pulse-slow
            `}
          >
            <span className="text-5xl">{tierIcon}</span>
          </div>

          {/* Congratulations text */}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Level Up!
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You've reached
          </p>

          {/* Level display */}
          <div className={`inline-block px-6 py-2 rounded-full bg-gradient-to-r ${tierColor} mb-6`}>
            <span className="text-white font-bold text-xl">
              Level {levelInfo.level}: {levelInfo.name}
            </span>
          </div>

          {/* Encouragement */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {getLevelMessage(levelInfo.name)}
          </p>

          {/* Continue button */}
          <button
            onClick={onClose}
            className="
              px-8 py-3 rounded-full
              bg-gradient-to-r from-primary to-cyan-500
              text-white font-medium
              shadow-lg hover:shadow-xl
              transform hover:scale-105 transition-all duration-200
            "
          >
            Keep Learning!
          </button>
        </div>
      </div>
    </>
  )
}

// Get encouraging message based on level tier
function getLevelMessage(tierName) {
  const messages = {
    Curious: "Your journey of discovery is just beginning!",
    Explorer: "You're venturing into new territories of knowledge!",
    Scholar: "Your dedication to learning is impressive!",
    Expert: "You've achieved mastery over many subjects!",
    Master: "You are a true knowledge seeker!"
  }
  return messages[tierName] || "Keep exploring and learning!"
}
