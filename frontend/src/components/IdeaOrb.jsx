/**
 * IdeaOrb - A simple animated gradient orb
 * Pulses and morphs when listening/speaking
 */
function IdeaOrb({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
  size = 'lg'
}) {
  // Size configs
  const sizes = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  }

  const pulseScale = isListening ? 1.1 + audioLevel * 0.15 : isSpeaking ? 1.05 : 1

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center`}>
      {/* Outer glow */}
      <div
        className="absolute rounded-full bg-gradient-to-br from-yellow-300/40 to-amber-400/40 blur-2xl transition-all duration-300"
        style={{
          width: '150%',
          height: '150%',
          transform: `scale(${isListening ? 1.2 + audioLevel * 0.3 : 1})`,
          opacity: isListening ? 0.8 : 0.4,
        }}
      />

      {/* Ping ring when listening */}
      {isListening && (
        <div
          className="absolute w-full h-full rounded-full border-2 border-yellow-400/50 animate-ping"
          style={{ animationDuration: '1.5s' }}
        />
      )}

      {/* Main orb */}
      <div
        className={`
          relative w-full h-full rounded-full
          bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-400
          shadow-lg shadow-amber-300/50
          transition-all duration-150
          ${!isListening && !isSpeaking ? 'animate-breathe' : ''}
        `}
        style={{
          transform: `scale(${pulseScale})`,
          boxShadow: isListening
            ? `0 0 ${30 + audioLevel * 30}px rgba(251, 191, 36, 0.6)`
            : '0 10px 40px rgba(251, 191, 36, 0.3)',
        }}
      >
        {/* Inner highlight */}
        <div
          className="absolute top-3 left-4 w-1/3 h-1/4 rounded-full bg-white/40 blur-sm"
        />

        {/* Center glow - pulses when speaking */}
        <div
          className={`
            absolute inset-0 m-auto w-1/2 h-1/2 rounded-full
            bg-gradient-to-br from-white/60 to-transparent
            transition-all duration-150
          `}
          style={{
            transform: `scale(${isSpeaking ? 1.2 : 1})`,
            opacity: isSpeaking ? 0.9 : 0.6,
          }}
        />
      </div>

      {/* Floating particles when listening */}
      {isListening && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-float"
              style={{
                left: `${10 + i * 15}%`,
                bottom: '20%',
                animationDelay: `${i * 0.2}s`,
                boxShadow: '0 0 8px 2px rgba(253, 224, 71, 0.6)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default IdeaOrb
