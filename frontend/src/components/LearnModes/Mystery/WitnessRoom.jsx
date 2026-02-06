import { useMemo, useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

const LEVEL_REQUIRED_QUESTIONS = {
  simple: 3,
  standard: 5,
  deep: 7,
}

export default function WitnessRoom({
  witnesses = [],
  explanationLevel = 'standard',
  disabled = false,
  onSubmit,
}) {
  const [activeWitnessIndex, setActiveWitnessIndex] = useState(0)
  const [askedQuestionIds, setAskedQuestionIds] = useState(() => new Set())
  const [revealedResponses, setRevealedResponses] = useState([])
  const [resolvedContradictions, setResolvedContradictions] = useState(() => new Set())

  const requiredQuestions = LEVEL_REQUIRED_QUESTIONS[explanationLevel] || LEVEL_REQUIRED_QUESTIONS.standard
  const activeWitness = witnesses[activeWitnessIndex] || null

  const totalQuestionPool = useMemo(() => {
    const ids = []
    for (const witness of witnesses) {
      const cards = Array.isArray(witness?.questionCards) ? witness.questionCards : []
      cards.forEach((question, index) => {
        ids.push(`${witness.id || 'w'}::${index}::${String(question)}`)
      })
    }
    return ids
  }, [witnesses])

  const askedCount = askedQuestionIds.size
  const requiredCount = Math.min(requiredQuestions, Math.max(1, totalQuestionPool.length || requiredQuestions))

  const contradictionKeysSeen = useMemo(() => {
    const keys = new Set()
    revealedResponses.forEach((response) => {
      if (response?.contradictionKey) {
        keys.add(String(response.contradictionKey))
      }
    })
    return keys
  }, [revealedResponses])

  const contradictionCandidateReady = contradictionKeysSeen.size >= 2
  const contradictionSatisfied = explanationLevel !== 'deep' || resolvedContradictions.size > 0

  const canContinue = askedCount >= requiredCount && contradictionSatisfied

  const handleQuestionClick = (question, index) => {
    if (!activeWitness || disabled) return

    const key = `${activeWitness.id || 'w'}::${index}::${String(question)}`

    setAskedQuestionIds((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })

    const responses = Array.isArray(activeWitness.responses) ? activeWitness.responses : []
    const response = responses.find((item) => String(item?.question) === String(question)) || responses[index] || null

    if (response) {
      setRevealedResponses((prev) => [
        {
          witnessId: activeWitness.id,
          witnessName: activeWitness.name,
          question,
          ...response,
        },
        ...prev,
      ].slice(0, 8))
    }

    vibrateShort()
  }

  const handleResolveContradiction = () => {
    if (!contradictionCandidateReady || disabled) return

    setResolvedContradictions((prev) => {
      const next = new Set(prev)
      const merged = [...contradictionKeysSeen].sort().join('|')
      next.add(merged)
      return next
    })

    vibrateShort()
  }

  const handleContinue = () => {
    if (!canContinue || disabled) return

    const bonusXp = askedCount > requiredCount ? (askedCount - requiredCount) * 2 : 0

    onSubmit?.({
      askedQuestionIds: Array.from(askedQuestionIds),
      resolvedContradictionKeys: Array.from(resolvedContradictions),
      resolvedContradictions: resolvedContradictions.size,
      bonusXp,
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 shadow-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Witness Room</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Ask strategic questions and verify testimony.</p>
        </div>
        <span className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {askedCount}/{requiredCount} questions
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {witnesses.map((witness, index) => (
          <button
            key={witness?.id || index}
            type="button"
            onClick={() => setActiveWitnessIndex(index)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] ${
              index === activeWitnessIndex
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            {witness?.name || `Witness ${index + 1}`}
          </button>
        ))}
      </div>

      {activeWitness && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {activeWitness.name} · {activeWitness.role}
            </p>
          </div>

          <div className="grid gap-2">
            {(activeWitness.questionCards || []).map((question, index) => {
              const questionId = `${activeWitness.id || 'w'}::${index}::${String(question)}`
              const asked = askedQuestionIds.has(questionId)

              return (
                <button
                  key={questionId}
                  type="button"
                  onClick={() => handleQuestionClick(question, index)}
                  disabled={disabled}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    asked
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-sm text-gray-800 dark:text-gray-100">{question}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Latest Statements</h4>
        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {revealedResponses.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No statements recorded yet.</p>
          )}
          {revealedResponses.map((response, index) => (
            <div key={`${response.witnessId}-${index}`} className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">{response.witnessName}</p>
              <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{response.statement}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Reliability: {Math.round(Number(response.reliability || 0.7) * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {explanationLevel === 'deep' && (
        <div className="p-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20">
          <p className="text-sm text-violet-700 dark:text-violet-300">
            Deep mode requires contradiction handling.
          </p>
          <button
            type="button"
            onClick={handleResolveContradiction}
            disabled={!contradictionCandidateReady || disabled}
            className="mt-2 px-4 py-2 min-h-[44px] rounded-full text-sm font-semibold bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Resolve Contradiction
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Bonus questions: {Math.max(0, askedCount - requiredCount)}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || disabled}
          className="px-5 py-3 rounded-full font-semibold bg-gradient-to-r from-indigo-500 to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Timeline
        </button>
      </div>
    </div>
  )
}
