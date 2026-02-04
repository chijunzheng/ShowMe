/**
 * MagicalTree Component
 *
 * Displays an animated tree that grows with learning progress.
 * Has 6 visual states based on topic count.
 * Supports quiz reaction overlays for engaging feedback.
 */

import { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import TreeSeed from './TreeSeed'
import TreeBranch from './TreeBranch'
import TreeLeaf from './TreeLeaf'
import TreeQuizReaction from './TreeQuizReaction'
import { TREE_LEVELS } from './treeUtils'

/**
 * Valid tree levels
 */
const VALID_LEVELS = new Set(Object.values(TREE_LEVELS))

/**
 * Tree level visual configurations
 */
const LEVEL_CONFIG = {
  seed: {
    showSeed: true,
    showSprout: false,
    showBranches: false,
    testId: 'tree-seed',
    description: 'Seed stage - no topics yet',
  },
  sprout: {
    showSeed: false,
    showSprout: true,
    showBranches: false,
    testId: 'tree-sprout',
    description: 'Sprout stage - 1-2 topics',
  },
  sapling: {
    showSeed: false,
    showSprout: false,
    showBranches: true,
    testId: 'tree-sapling',
    description: 'Sapling stage - 3-5 topics',
  },
  young: {
    showSeed: false,
    showSprout: false,
    showBranches: true,
    testId: 'tree-young',
    description: 'Young tree stage - 6-10 topics',
  },
  mature: {
    showSeed: false,
    showSprout: false,
    showBranches: true,
    testId: 'tree-mature',
    canopy: true,
    description: 'Mature tree stage - 11-20 topics',
  },
  magical: {
    showSeed: false,
    showSprout: false,
    showBranches: true,
    testId: 'tree-magical',
    canopy: true,
    particles: true,
    description: 'Magical tree stage - 21+ topics',
  },
}

/**
 * Sprout component for early growth stages
 */
function TreeSprout({ topics = [], onLeafClick }) {
  return (
    <div
      data-testid="tree-sprout"
      className="
        relative
        flex flex-col items-center
        w-full h-full
        bg-gradient-to-b from-sky-100 to-emerald-100
        dark:from-sky-900/20 dark:to-emerald-900/20
        rounded-xl
        p-4
      "
    >
      {/* Stem */}
      <div className="relative flex-1 flex flex-col items-center justify-end">
        <div className="w-2 h-32 bg-gradient-to-t from-amber-700 to-emerald-500 rounded-full" />

        {/* Leaves on sprout */}
        <div className="absolute bottom-24 flex gap-2">
          {topics.slice(0, 2).map((topic, index) => (
            <TreeLeaf
              key={topic.id || index}
              topic={topic}
              zone={topic.zone || 'nature'}
              onClick={onLeafClick}
              isNew={topic.isNew}
              size="small"
            />
          ))}
        </div>
      </div>

      {/* Ground */}
      <div className="w-full h-8 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-full mt-auto" />
    </div>
  )
}

/**
 * Magical particles component for magical tree stage
 */
function MagicalParticles() {
  const particles = useMemo(() => {
    return [...Array(12)].map((_, i) => ({
      id: i,
      left: `${10 + (i * 7) % 80}%`,
      top: `${10 + (i * 11) % 60}%`,
      delay: `${i * 0.3}s`,
      duration: `${2 + (i % 3)}s`,
    }))
  }, [])

  return (
    <div
      data-testid="magical-particles"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-pulse"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Tree trunk and canopy component
 */
function TreeTrunk({ level, children }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.seed

  return (
    <div
      data-testid={config.testId}
      className={`
        relative
        flex flex-col items-center
        w-full h-full
        bg-gradient-to-b from-sky-100 to-emerald-100
        dark:from-sky-900/20 dark:to-emerald-900/20
        rounded-xl
        p-4
        ${config.canopy ? 'canopy full' : ''}
      `}
    >
      {/* Canopy background for mature/magical trees */}
      {config.canopy && (
        <div
          className="
            absolute top-4 left-1/2 -translate-x-1/2
            w-3/4 h-1/2
            bg-gradient-to-b from-emerald-300 to-emerald-500
            dark:from-emerald-700 dark:to-emerald-900
            rounded-full opacity-30
          "
        />
      )}

      {/* Branches container */}
      <div className="relative flex-1 w-full overflow-y-auto">
        {children}
      </div>

      {/* Tree trunk */}
      <div
        className="
          w-6 h-20
          bg-gradient-to-t from-amber-800 to-amber-600
          dark:from-amber-900 dark:to-amber-700
          rounded-t-lg
          mt-2
        "
      />

      {/* Ground */}
      <div className="w-full h-6 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-full" />
    </div>
  )
}

/**
 * MagicalTree - Main tree visualization component
 *
 * @param {Object} props
 * @param {string} props.treeLevel - Current tree level (seed, sprout, sapling, young, mature, magical)
 * @param {Object} props.branches - Topics grouped by zone { nature: [], civilization: [], arcane: [] }
 * @param {number} props.totalTopics - Total number of learned topics
 * @param {Function} props.onLeafClick - Callback when a leaf is clicked
 * @param {boolean} props.isAnimating - Whether the tree is currently animating
 * @param {Object} props.quizReaction - Quiz reaction to display { type, score, topicName, ... }
 * @param {Function} props.onQuizReactionComplete - Callback when quiz reaction animation ends
 */
export default function MagicalTree({
  treeLevel = 'seed',
  branches = { nature: [], civilization: [], arcane: [] },
  totalTopics = 0,
  onLeafClick,
  isAnimating = false,
  quizReaction,
  onQuizReactionComplete,
}) {
  // Validate and normalize tree level
  const level = VALID_LEVELS.has(treeLevel) ? treeLevel : 'seed'
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.seed

  // Safe branches access
  const safeBranches = branches || { nature: [], civilization: [], arcane: [] }

  // Flatten all topics for sprout view
  const allTopics = useMemo(() => {
    return [
      ...(safeBranches.nature || []),
      ...(safeBranches.civilization || []),
      ...(safeBranches.arcane || []),
    ]
  }, [safeBranches])

  return (
    <div
      data-testid="magical-tree"
      className={`
        relative
        w-full h-full
        min-h-[300px]
        ${isAnimating ? 'animate-pulse transition-all duration-500' : ''}
      `}
      role="img"
      aria-label={`Your learning tree at ${level} stage with ${totalTopics} topics`}
    >
      {/* Seed state */}
      {config.showSeed && (
        <TreeSeed />
      )}

      {/* Sprout state */}
      {config.showSprout && (
        <TreeSprout topics={allTopics} onLeafClick={onLeafClick} />
      )}

      {/* Tree with branches (sapling, young, mature, magical) */}
      {config.showBranches && (
        <TreeTrunk level={level}>
          {/* Zone branches */}
          <div className="flex flex-col gap-4 p-2">
            {/* Nature branch (left) */}
            {safeBranches.nature && safeBranches.nature.length > 0 && (
              <TreeBranch
                zone="nature"
                topics={safeBranches.nature}
                onLeafClick={onLeafClick}
                position="left"
                animate={isAnimating}
              />
            )}

            {/* Civilization branch (right) */}
            {safeBranches.civilization && safeBranches.civilization.length > 0 && (
              <TreeBranch
                zone="civilization"
                topics={safeBranches.civilization}
                onLeafClick={onLeafClick}
                position="right"
                animate={isAnimating}
              />
            )}

            {/* Arcane branch (center) */}
            {safeBranches.arcane && safeBranches.arcane.length > 0 && (
              <TreeBranch
                zone="arcane"
                topics={safeBranches.arcane}
                onLeafClick={onLeafClick}
                position="center"
                animate={isAnimating}
              />
            )}
          </div>

          {/* Magical particles for magical state */}
          {config.particles && <MagicalParticles />}

          {/* Magical label */}
          {level === 'magical' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
              Magical Tree
            </div>
          )}
        </TreeTrunk>
      )}

      {/* Quiz reaction overlay */}
      {quizReaction && (
        <TreeQuizReaction
          reaction={quizReaction}
          onComplete={onQuizReactionComplete}
        />
      )}
    </div>
  )
}

MagicalTree.propTypes = {
  treeLevel: PropTypes.oneOf(['seed', 'sprout', 'sapling', 'young', 'mature', 'magical']),
  branches: PropTypes.shape({
    nature: PropTypes.array,
    civilization: PropTypes.array,
    arcane: PropTypes.array,
  }),
  totalTopics: PropTypes.number,
  onLeafClick: PropTypes.func,
  isAnimating: PropTypes.bool,
  quizReaction: PropTypes.shape({
    type: PropTypes.string.isRequired,
    score: PropTypes.number,
    topicName: PropTypes.string,
    streakCount: PropTypes.number,
    timestamp: PropTypes.number,
  }),
  onQuizReactionComplete: PropTypes.func,
}
