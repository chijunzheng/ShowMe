/**
 * Confetti Component
 * POLISH-001: Celebratory confetti animation for achievements
 * T001: Confetti animation plays on badge unlock
 * T002: Confetti cleans up after animation ends
 * T005: Animations run smoothly (60fps via CSS)
 */

import { useEffect, useState, useCallback } from 'react'

// Confetti colors using design system
const COLORS = [
  '#6366F1', // Primary
  '#06B6D4', // Cyan
  '#F59E0B', // Accent orange
  '#22C55E', // Success green
  '#EC4899', // Pink
  '#8B5CF6', // Purple
]

// Generate random confetti pieces
function generateConfetti(count = 50) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // percentage across screen
    delay: Math.random() * 0.5, // stagger start
    duration: 2 + Math.random() * 2, // 2-4 seconds
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6, // 6-12px
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'circle' : 'square'
  }))
}

export default function Confetti({
  isActive = false,
  duration = 3000,
  onComplete
}) {
  const [pieces, setPieces] = useState([])

  const startConfetti = useCallback(() => {
    setPieces(generateConfetti(60))

    // Clean up after animation (T002)
    const timer = setTimeout(() => {
      setPieces([])
      onComplete?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  useEffect(() => {
    if (isActive) {
      return startConfetti()
    }
  }, [isActive, startConfetti])

  if (pieces.length === 0) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
