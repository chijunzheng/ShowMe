/**
 * LoadingTopicScreen component - Shows loading state for historical topic TTS
 * Displayed while audio is being prepared for a previously viewed topic
 */
import TopicHeader from '../TopicHeader.jsx'

/**
 * @param {Object} props
 * @param {Object} props.topic - The topic being loaded
 * @param {number} props.progress - Loading progress percentage (0-100)
 */
export default function LoadingTopicScreen({ topic, progress }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 md:px-0 animate-fade-in">
      <div className="w-full max-w-2xl">
        <div className="relative w-full aspect-video overflow-hidden rounded-xl shadow-lg">
          <TopicHeader
            icon={topic.icon}
            name={topic.name}
          />
          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-sm text-center mt-3 font-medium">
              Preparing narration... {progress > 10 ? `${progress}%` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
