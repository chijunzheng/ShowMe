/**
 * TrophyBadge Test Page
 *
 * A dedicated page for E2E testing the TrophyBadge component.
 * Access via: /?test=trophy-badge
 *
 * This page renders multiple TrophyBadge variants with data-testid attributes
 * to enable comprehensive E2E testing of all badge features.
 */

import { useState, useCallback } from 'react'
import TrophyBadge from '../components/LivingWorld/TrophyBadge'

/**
 * Test wrapper that tracks click and celebration events
 */
function BadgeTestWrapper({
  id,
  type,
  level,
  size,
  title,
  showTitle,
  animated,
  isNew,
  progress,
  icon,
}) {
  const [clickCount, setClickCount] = useState(0)
  const [celebrationComplete, setCelebrationComplete] = useState(false)

  const handleClick = useCallback(() => {
    setClickCount((prev) => prev + 1)
  }, [])

  const handleCelebrationComplete = useCallback(() => {
    setCelebrationComplete(true)
  }, [])

  return (
    <div
      data-testid={`badge-wrapper-${id}`}
      className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
    >
      <div data-testid={`badge-container-${id}`}>
        <TrophyBadge
          type={type}
          level={level}
          size={size}
          title={title}
          showTitle={showTitle}
          animated={animated}
          isNew={isNew}
          progress={progress}
          icon={icon}
          onClick={handleClick}
          onCelebrationComplete={handleCelebrationComplete}
        />
      </div>
      <div className="text-xs text-slate-500 mt-2">
        <span data-testid={`click-count-${id}`}>Clicks: {clickCount}</span>
        {isNew && (
          <span data-testid={`celebration-status-${id}`} className="ml-2">
            Celebration: {celebrationComplete ? 'Complete' : 'Playing'}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * TrophyBadgeTestPage - E2E Test Page for TrophyBadge Component
 */
function TrophyBadgeTestPage() {
  return (
    <div
      data-testid="trophy-badge-test-page"
      className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6"
    >
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
        TrophyBadge E2E Test Page
      </h1>

      {/* Section 1: Badge Types */}
      <section data-testid="section-badge-types" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Badge Types
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="explorer"
            type="explorer"
            level={1}
            size="md"
            title="Explorer"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="master"
            type="master"
            level={2}
            size="md"
            title="Master"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="streak"
            type="streak"
            level={3}
            size="md"
            title="Streak"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="milestone"
            type="milestone"
            level={1}
            size="md"
            title="Milestone"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="custom"
            type="custom"
            level={2}
            size="md"
            title="Custom"
            icon="🎉"
            showTitle={true}
          />
        </div>
      </section>

      {/* Section 2: Size Variants */}
      <section data-testid="section-size-variants" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Size Variants
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <BadgeTestWrapper
            id="size-sm"
            type="explorer"
            level={1}
            size="sm"
            title="Small (32px)"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="size-md"
            type="explorer"
            level={1}
            size="md"
            title="Medium (48px)"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="size-lg"
            type="explorer"
            level={1}
            size="lg"
            title="Large (64px)"
            showTitle={true}
          />
        </div>
      </section>

      {/* Section 3: Level Rings */}
      <section data-testid="section-level-rings" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Level Rings (Bronze/Silver/Gold)
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="level-bronze"
            type="milestone"
            level={1}
            size="lg"
            title="Bronze (Level 1)"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="level-silver"
            type="milestone"
            level={2}
            size="lg"
            title="Silver (Level 2)"
            showTitle={true}
          />
          <BadgeTestWrapper
            id="level-gold"
            type="milestone"
            level={3}
            size="lg"
            title="Gold (Level 3)"
            showTitle={true}
          />
        </div>
      </section>

      {/* Section 4: Animated Badge */}
      <section data-testid="section-animated" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Animated Badge (Shine Effect)
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="animated"
            type="master"
            level={3}
            size="lg"
            title="Animated"
            showTitle={true}
            animated={true}
          />
          <BadgeTestWrapper
            id="not-animated"
            type="master"
            level={3}
            size="lg"
            title="Not Animated"
            showTitle={true}
            animated={false}
          />
        </div>
      </section>

      {/* Section 5: New Badge Celebration */}
      <section data-testid="section-celebration" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          New Badge Celebration
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="new-badge"
            type="milestone"
            level={3}
            size="lg"
            title="New Badge!"
            showTitle={true}
            isNew={true}
          />
        </div>
      </section>

      {/* Section 6: Progress Ring */}
      <section data-testid="section-progress" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Progress Ring (Mastery Tracking)
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="progress-25"
            type="master"
            level={1}
            size="lg"
            title="25% Progress"
            showTitle={true}
            progress={25}
          />
          <BadgeTestWrapper
            id="progress-50"
            type="master"
            level={2}
            size="lg"
            title="50% Progress"
            showTitle={true}
            progress={50}
          />
          <BadgeTestWrapper
            id="progress-75"
            type="master"
            level={2}
            size="lg"
            title="75% Progress"
            showTitle={true}
            progress={75}
          />
          <BadgeTestWrapper
            id="progress-100"
            type="master"
            level={3}
            size="lg"
            title="100% Complete"
            showTitle={true}
            progress={100}
          />
        </div>
      </section>

      {/* Section 7: Click Interaction */}
      <section data-testid="section-interaction" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Click Interaction
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="clickable"
            type="explorer"
            level={2}
            size="lg"
            title="Click Me"
            showTitle={true}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Click the badge above to test interaction. Count should increment.
        </p>
      </section>

      {/* Section 8: Keyboard Interaction */}
      <section data-testid="section-keyboard" className="mb-8">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Keyboard Interaction
        </h2>
        <div className="flex flex-wrap gap-4">
          <BadgeTestWrapper
            id="keyboard-focus"
            type="streak"
            level={3}
            size="lg"
            title="Tab to Focus"
            showTitle={true}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Tab to this badge and press Enter or Space to activate.
        </p>
      </section>
    </div>
  )
}

export default TrophyBadgeTestPage
