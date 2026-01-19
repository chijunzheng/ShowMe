/**
 * LevelCard - Voice-activated level selection card
 *
 * Tapping a card selects the explanation level AND triggers voice input.
 * Each card acts as both a setting and a "Start" button.
 */
function LevelCard({
  level,
  icon,
  title,
  description,
  isSelected = false,
  onClick
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border-2 transition-all duration-200
        flex items-center gap-4 text-left
        hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
        ${isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-gray-200 hover:border-primary/50 bg-white'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center
        rounded-full transition-colors
        ${isSelected ? 'bg-primary/10' : 'bg-gray-50'}
      `}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-lg ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
            {title}
          </h3>
          {level === 'standard' && !isSelected && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              default
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {description}
        </p>
      </div>

      {/* Mic indicator */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-200
        ${isSelected
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
        }
      `}>
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </div>
    </button>
  )
}

export default LevelCard
