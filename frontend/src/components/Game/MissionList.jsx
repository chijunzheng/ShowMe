/**
 * MissionList Component
 * GAMIFY-004: Mission list with filter tabs and reset timers
 *
 * Displays a filterable list of missions with:
 * - Filter tabs: Daily | Weekly | All
 * - MissionCard components for each mission
 * - Empty state when no missions
 * - Reset timer for daily/weekly missions
 */

import { useState, useEffect, useMemo } from 'react'
import MissionCard from './MissionCard'

/**
 * Calculate time until next reset
 * @param {string} type - 'daily' or 'weekly'
 * @returns {Object} { hours, minutes, seconds }
 */
function getTimeUntilReset(type) {
  const now = new Date()

  if (type === 'daily') {
    // Time until midnight
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const diff = tomorrow - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return { hours, minutes }
  }

  if (type === 'weekly') {
    // Time until next Monday midnight
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    const nextMonday = new Date(now)
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)

    const diff = nextMonday - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    return { days, hours }
  }

  return null
}

/**
 * Format reset time for display
 * @param {Object} time - { hours, minutes } or { days, hours }
 * @param {string} type - 'daily' or 'weekly'
 * @returns {string} Formatted time string
 */
function formatResetTime(time, type) {
  if (!time) return ''

  if (type === 'daily') {
    return `${time.hours}h ${time.minutes}m`
  }

  if (type === 'weekly') {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`
    }
    return `${time.hours}h`
  }

  return ''
}

const FILTER_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'all', label: 'All' },
]

/**
 * @param {Object} props
 * @param {Array} props.missions - Array of mission objects
 * @param {string} props.filter - Initial filter: 'daily' | 'weekly' | 'all'
 * @param {Function} props.onClaimMission - Callback when mission is claimed
 */
export default function MissionList({
  missions,
  filter: initialFilter = 'daily',
  onClaimMission,
}) {
  const [activeFilter, setActiveFilter] = useState(initialFilter)
  const [resetTime, setResetTime] = useState(null)

  // Update reset timer
  useEffect(() => {
    if (activeFilter === 'all') {
      setResetTime(null)
      return
    }

    const updateTimer = () => {
      setResetTime(getTimeUntilReset(activeFilter))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [activeFilter])

  // Filter missions based on active tab
  const filteredMissions = useMemo(() => {
    if (!missions || !Array.isArray(missions)) {
      return []
    }

    if (activeFilter === 'all') {
      return missions
    }

    return missions.filter((mission) => mission.type === activeFilter)
  }, [missions, activeFilter])

  // Check if we should show empty state
  const showEmptyState = filteredMissions.length === 0

  return (
    <div className="w-full" data-testid="mission-list">
      {/* Filter Tabs */}
      <div
        className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4"
        role="tablist"
        aria-label="Mission filters"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeFilter === tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all
              ${
                activeFilter === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reset Timer */}
      {resetTime && activeFilter !== 'all' && (
        <div
          className="flex items-center justify-center gap-2 mb-4 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          data-testid="reset-timer"
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Resets in{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {formatResetTime(resetTime, activeFilter)}
            </span>
          </span>
        </div>
      )}

      {/* Mission Cards Panel */}
      <div role="tabpanel" aria-label={`${activeFilter} missions`}>
        {showEmptyState ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
            data-testid="empty-state"
          >
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              No missions available
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
              Check back later for new missions to complete!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClaim={onClaimMission}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
