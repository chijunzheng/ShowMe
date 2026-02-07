import { useMemo, useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

const LEVEL_REQUIRED = {
  simple: 3,
  standard: 5,
  deep: 7,
}

function getRequiredHotspots(crimeScene, explanationLevel) {
  const hotspots = Array.isArray(crimeScene?.hotspots) ? crimeScene.hotspots : []
  const configured = Number.isFinite(Number(crimeScene?.requiredHotspotCount))
    ? Number(crimeScene.requiredHotspotCount)
    : (LEVEL_REQUIRED[explanationLevel] || LEVEL_REQUIRED.standard)

  const candidate = hotspots.filter((spot) => !spot?.bonus)
  return candidate.slice(0, Math.min(configured, candidate.length))
}

export default function CrimeSceneScan({
  crimeScene,
  sceneImage,
  explanationLevel = 'standard',
  disabled = false,
  onSubmit,
}) {
  const [foundIds, setFoundIds] = useState(() => new Set())

  const hotspots = Array.isArray(crimeScene?.hotspots) ? crimeScene.hotspots : []
  const evidenceCards = Array.isArray(crimeScene?.evidenceCards) ? crimeScene.evidenceCards : []

  const requiredHotspots = useMemo(
    () => getRequiredHotspots(crimeScene, explanationLevel),
    [crimeScene, explanationLevel]
  )

  const foundRequiredCount = requiredHotspots.filter((spot) => foundIds.has(String(spot.id))).length
  const requiredCount = requiredHotspots.length
  const allRequiredFound = requiredCount > 0 && foundRequiredCount >= requiredCount

  const discoveredEvidence = useMemo(() => {
    const seen = new Set()
    const results = []

    for (const spot of hotspots) {
      if (!foundIds.has(String(spot?.id))) continue
      const eid = String(spot?.evidenceId || '')
      const card = evidenceCards.find((c) => String(c?.id) === eid)
      if (card && !seen.has(card.id)) {
        seen.add(card.id)
        results.push(card)
      }
    }

    // Index-based fallback when evidenceId linkage is broken
    if (results.length === 0 && foundIds.size > 0) {
      const foundHotspots = hotspots.filter((s) => foundIds.has(String(s?.id)))
      for (const [i, spot] of foundHotspots.entries()) {
        const card = evidenceCards[i]
        if (card && !seen.has(card.id)) {
          seen.add(card.id)
          results.push(card)
        }
      }
    }

    return results
  }, [hotspots, evidenceCards, foundIds])

  const bonusFound = hotspots.filter((spot) => Boolean(spot?.bonus) && foundIds.has(String(spot?.id))).length

  const handleSpotClick = (spotId) => {
    if (disabled) return
    const key = String(spotId)

    setFoundIds((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })

    vibrateShort()
  }

  const handleContinue = () => {
    if (!allRequiredFound || disabled) return

    onSubmit?.({
      foundHotspotIds: Array.from(foundIds),
      bonusFinds: bonusFound,
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-amber-200 dark:border-amber-700 shadow-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Crime Scene Scan</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tap suspicious hotspots to uncover evidence.
          </p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {foundRequiredCount}/{requiredCount} core clues
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-700 bg-gray-100 dark:bg-gray-900">
        {sceneImage ? (
          <img
            src={sceneImage}
            alt="Crime scene"
            className="w-full h-[300px] object-cover"
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Scene image unavailable. Scan the map overlay instead.
          </div>
        )}

        {hotspots.map((spot) => {
          const id = String(spot?.id)
          const isFound = foundIds.has(id)
          const radius = Math.max(10, Number(spot?.radius || 8) * 2)

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSpotClick(id)}
              disabled={disabled}
              aria-label={spot?.bonus ? 'Bonus hotspot' : 'Core hotspot'}
              className={`absolute rounded-full border-2 transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 ${
                isFound
                  ? 'bg-emerald-500/70 border-emerald-100 scale-110'
                  : spot?.bonus
                    ? 'bg-indigo-500/40 border-indigo-100 hover:scale-105'
                    : 'bg-amber-500/45 border-amber-100 hover:scale-105'
              }`}
              style={{
                left: `${Number(spot?.x || 50)}%`,
                top: `${Number(spot?.y || 50)}%`,
                width: `${radius * 2}px`,
                height: `${radius * 2}px`,
              }}
            />
          )
        })}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Discovered Evidence</h4>
        <div className="space-y-2 max-h-48 overflow-auto pr-1">
          {discoveredEvidence.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No evidence collected yet.</p>
          )}
          {discoveredEvidence.map((card) => (
            <div key={card.id} className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/20">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{card.title}</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Bonus clues found: {bonusFound}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allRequiredFound || disabled}
          className="px-5 py-3 rounded-full font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Witness Room
        </button>
      </div>
    </div>
  )
}
