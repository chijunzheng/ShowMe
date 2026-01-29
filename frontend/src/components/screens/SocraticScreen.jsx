/**
 * SocraticScreen component - Wrapper for Socratic questioning mode
 * Displayed when uiState is SOCRATIC and activeTab is 'learn'
 */
import SocraticMode from '../SocraticMode/index.jsx'

/**
 * @param {Object} props
 * @param {Array} props.socraticSlides - Slides to review in Socratic mode
 * @param {string} props.socraticTopicName - Name of the topic being reviewed
 * @param {string} props.socraticLanguage - Language for the Socratic session ('en' or 'zh')
 * @param {Array} props.suggestedQuestions - Suggested follow-up questions
 * @param {Function} props.onComplete - Handler when Socratic session completes
 * @param {Function} props.onFollowUp - Handler for follow-up questions
 * @param {Function} props.onSkip - Handler when user skips Socratic mode
 */
export default function SocraticScreen({
  socraticSlides,
  socraticTopicName,
  socraticLanguage,
  suggestedQuestions,
  onComplete,
  onFollowUp,
  onSkip,
}) {
  return (
    <SocraticMode
      slides={socraticSlides}
      topicName={socraticTopicName}
      language={socraticLanguage}
      suggestedQuestions={suggestedQuestions}
      onComplete={onComplete}
      onFollowUp={onFollowUp}
      onSkip={onSkip}
    />
  )
}
