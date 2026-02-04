/**
 * ModeSelectorScreen - Screen wrapper for ModeSelector component
 *
 * Shown after slideshow completion in Full mode
 * Replaces traditional quiz prompt with 3 engaging learning modes
 */

import { ModeSelector } from '../LearnModes'

export default function ModeSelectorScreen({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onModeSelect,
  onSkip,
}) {
  return (
    <div className="fixed inset-0 z-50">
      <ModeSelector
        slides={slides}
        topicName={topicName}
        explanationLevel={explanationLevel}
        onModeSelect={onModeSelect}
        onSkip={onSkip}
      />
    </div>
  )
}
