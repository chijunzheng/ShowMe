import { useMemo, useState } from 'react'
import SolveVoiceText from './SolveVoiceText'

const REQUIREMENTS = {
  simple: { confidence: false, rationale: false },
  standard: { confidence: true, rationale: false },
  deep: { confidence: true, rationale: true },
}

export default function WarrantDecision({
  topicName,
  verdict,
  explanationLevel = 'standard',
  disabled = false,
  onSubmit,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [confidence, setConfidence] = useState(75)
  const [rationale, setRationale] = useState('')
  const [rationaleCapturedByVoice, setRationaleCapturedByVoice] = useState(false)

  const options = Array.isArray(verdict?.options) ? verdict.options : []
  const expectedConcepts = Array.isArray(verdict?.expectedConcepts) ? verdict.expectedConcepts : []
  const rules = REQUIREMENTS[explanationLevel] || REQUIREMENTS.standard

  const canSubmit = useMemo(() => {
    if (selectedIndex === null) return false
    if (rules.confidence && !Number.isFinite(Number(confidence))) return false
    if (rules.rationale && !rationale.trim()) return false
    return true
  }, [selectedIndex, confidence, rationale, rules])

  const handleCaptureTheory = ({ theory }) => {
    if (!theory) return
    setRationale(theory)
    setRationaleCapturedByVoice(true)
  }

  const handleSubmit = () => {
    if (!canSubmit || disabled) return

    onSubmit?.({
      selectedIndex,
      confidence: rules.confidence ? Number(confidence) : undefined,
      rationale: rationale.trim() || undefined,
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-rose-200 dark:border-rose-700 shadow-lg p-6 space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">File the Warrant</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Choose the most likely cause and lock your final decision.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <button
            key={`${option}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-xl border transition-colors ${
              selectedIndex === index
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <p className="text-sm text-gray-800 dark:text-gray-100">{option}</p>
          </button>
        ))}
      </div>

      {rules.confidence && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-900/20 space-y-2">
          <label className="text-sm font-semibold text-rose-700 dark:text-rose-300" htmlFor="warrant-confidence">
            Confidence: {confidence}%
          </label>
          <input
            id="warrant-confidence"
            type="range"
            min="0"
            max="100"
            step="1"
            value={confidence}
            disabled={disabled}
            onChange={(event) => setConfidence(Number(event.target.value))}
            className="w-full"
          />
        </div>
      )}

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 space-y-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Rationale Capture</p>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use voice/text capture to store your one-line warrant rationale.
        </p>

        <SolveVoiceText
          topicName={topicName}
          expectedConcepts={expectedConcepts}
          onSubmit={handleCaptureTheory}
          disabled={disabled}
        />

        <textarea
          value={rationale}
          onChange={(event) => {
            setRationale(event.target.value.slice(0, 500))
            setRationaleCapturedByVoice(false)
          }}
          rows={2}
          disabled={disabled}
          placeholder="Optional in simple/standard. Required in deep mode."
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
        />

        {rationaleCapturedByVoice && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Rationale captured from voice/text tool.</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || disabled}
        className="w-full py-3 rounded-full font-semibold bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        File Warrant
      </button>
    </div>
  )
}
