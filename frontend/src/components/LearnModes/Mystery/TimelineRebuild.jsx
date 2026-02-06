import { useMemo, useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

export default function TimelineRebuild({
  timeline,
  explanationLevel = 'standard',
  disabled = false,
  onSubmit,
}) {
  const sourceEvents = useMemo(() => {
    const events = Array.isArray(timeline?.events) ? timeline.events : []
    return [...events].sort((a, b) => Number(b?.order || 0) - Number(a?.order || 0))
  }, [timeline])

  const [orderedEvents, setOrderedEvents] = useState(sourceEvents)
  const [draggingId, setDraggingId] = useState(null)
  const [linkFrom, setLinkFrom] = useState('')
  const [linkTo, setLinkTo] = useState('')
  const [causalLinks, setCausalLinks] = useState([])

  const expectedOrderIds = useMemo(() => {
    const events = Array.isArray(timeline?.events) ? timeline.events : []
    return [...events]
      .filter((event) => !event?.isRedHerring)
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
      .map((event) => String(event.id))
  }, [timeline])

  const expectedLinks = useMemo(() => {
    return (Array.isArray(timeline?.causalLinks) ? timeline.causalLinks : [])
      .map((link) => `${String(link?.from || '')}->${String(link?.to || '')}`)
      .filter((entry) => entry !== '->')
  }, [timeline])

  const normalizedCurrentOrder = orderedEvents
    .map((event) => String(event?.id))
    .filter((id) => expectedOrderIds.includes(id))

  const orderCorrect = expectedOrderIds.length > 0 &&
    expectedOrderIds.length === normalizedCurrentOrder.length &&
    expectedOrderIds.every((id, index) => normalizedCurrentOrder[index] === id)

  const requiresCausalLinks = explanationLevel === 'deep'
  const currentLinksSet = new Set(causalLinks.map((link) => `${link.from}->${link.to}`))
  const linksCorrect = expectedLinks.length === 0 || expectedLinks.every((entry) => currentLinksSet.has(entry))

  const canContinue = orderCorrect && (!requiresCausalLinks || linksCorrect)

  const moveEvent = (eventId, direction) => {
    if (disabled) return

    setOrderedEvents((prev) => {
      const index = prev.findIndex((event) => String(event.id) === String(eventId))
      if (index === -1) return prev

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })

    vibrateShort()
  }

  const handleDropOnEvent = (targetId) => {
    if (disabled || !draggingId || draggingId === targetId) return

    setOrderedEvents((prev) => {
      const fromIndex = prev.findIndex((event) => String(event.id) === String(draggingId))
      const toIndex = prev.findIndex((event) => String(event.id) === String(targetId))
      if (fromIndex === -1 || toIndex === -1) return prev

      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })

    setDraggingId(null)
    vibrateShort()
  }

  const addLink = () => {
    if (!linkFrom || !linkTo || linkFrom === linkTo || disabled) return

    setCausalLinks((prev) => {
      const exists = prev.some((link) => String(link.from) === linkFrom && String(link.to) === linkTo)
      if (exists) return prev
      return [...prev, { from: linkFrom, to: linkTo }]
    })

    setLinkFrom('')
    setLinkTo('')
    vibrateShort()
  }

  const removeLink = (entry) => {
    if (disabled) return
    setCausalLinks((prev) => prev.filter((link) => `${link.from}->${link.to}` !== entry))
    vibrateShort()
  }

  const handleContinue = () => {
    if (!canContinue || disabled) return

    const bonusXp = orderedEvents.some((event) => event?.isRedHerring) ? 5 : 0

    onSubmit?.({
      orderedEventIds: orderedEvents.map((event) => String(event.id)),
      causalLinks,
      bonusXp,
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-cyan-200 dark:border-cyan-700 shadow-lg p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Timeline Rebuild</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Reorder events to reconstruct what happened.
          </p>
        </div>
        <span className="px-3 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
          {orderCorrect ? 'Order locked' : 'Order pending'}
        </span>
      </div>

      <div className="space-y-2">
        {orderedEvents.map((event, index) => {
          const id = String(event.id)
          return (
            <div
              key={id}
              className={`p-3 rounded-xl border ${
                event?.isRedHerring
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
              }`}
              draggable={!disabled}
              onDragStart={() => setDraggingId(id)}
              onDragOver={(eventDrag) => eventDrag.preventDefault()}
              onDrop={() => handleDropOnEvent(id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">#{index + 1}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{event.text}</p>
                  {event?.isRedHerring && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Potential red herring</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveEvent(id, 'up')}
                    disabled={disabled || index === 0}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveEvent(id, 'down')}
                    disabled={disabled || index === orderedEvents.length - 1}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {requiresCausalLinks && (
        <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 space-y-3">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Deep mode: Add causal links</p>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={linkFrom}
              onChange={(event) => setLinkFrom(event.target.value)}
              className="px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-gray-800 text-sm"
              disabled={disabled}
            >
              <option value="">From event</option>
              {orderedEvents.map((event) => (
                <option key={`from-${event.id}`} value={String(event.id)}>{event.text.slice(0, 36)}</option>
              ))}
            </select>

            <span className="text-sm text-violet-700 dark:text-violet-300">because</span>

            <select
              value={linkTo}
              onChange={(event) => setLinkTo(event.target.value)}
              className="px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-gray-800 text-sm"
              disabled={disabled}
            >
              <option value="">To event</option>
              {orderedEvents.map((event) => (
                <option key={`to-${event.id}`} value={String(event.id)}>{event.text.slice(0, 36)}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={addLink}
              disabled={disabled || !linkFrom || !linkTo || linkFrom === linkTo}
              className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-50"
            >
              Add link
            </button>
          </div>

          <div className="space-y-2">
            {causalLinks.length === 0 && (
              <p className="text-sm text-violet-700 dark:text-violet-300">No links added yet.</p>
            )}
            {causalLinks.map((link) => {
              const key = `${link.from}->${link.to}`
              return (
                <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/80 dark:bg-gray-800 border border-violet-200 dark:border-violet-700">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{key}</span>
                  <button
                    type="button"
                    onClick={() => removeLink(key)}
                    disabled={disabled}
                    className="text-xs text-red-600 dark:text-red-300"
                  >
                    remove
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-cyan-700 dark:text-cyan-300">
          {canContinue ? 'Timeline solved.' : 'Keep refining the event sequence.'}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || disabled}
          className="px-5 py-3 rounded-full font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Warrant
        </button>
      </div>
    </div>
  )
}
