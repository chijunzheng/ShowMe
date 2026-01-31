/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Curious Explorer: Kid-friendly color palette
        primary: {
          DEFAULT: '#FF6B4A',
          50: '#FFF5F2',
          100: '#FFE8E2',
          200: '#FFCFC4',
          300: '#FFB0A0',
          400: '#FF8A6E',
          500: '#FF6B4A',
          600: '#E85A3C',
          700: '#C44830',
        },
        secondary: {
          DEFAULT: '#00B4A0',
          50: '#ECFDF9',
          100: '#D1FAF0',
          200: '#A7F3E2',
          300: '#6EE7D0',
          400: '#2DD4C4',
          500: '#00B4A0',
          600: '#009688',
          700: '#007A6E',
        },
        accent: {
          DEFAULT: '#FFB830',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FFCB5C',
          400: '#FFB830',
          500: '#F5A623',
          600: '#D97706',
        },
        cream: {
          50: '#FFFDFB',
          100: '#FFF9F5',
          200: '#FFF5EE',
          300: '#FFEEE3',
        },
        night: {
          900: '#1A1625',
          800: '#252033',
          700: '#2D2640',
          600: '#3D3555',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#1E293B',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
        success: {
          DEFAULT: '#22C55E',
          dark: '#4ADE80',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
        },
        streak: {
          orange: '#F59E0B',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'Nunito', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 1.5s ease-in-out infinite',
        'waveform': 'waveform 1s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'float': 'float 2s ease-in-out infinite',
        // POLISH-001: New animations for gamification
        'confetti-fall': 'confettiFall 3s ease-out forwards',
        'toast-enter': 'toastEnter 0.3s ease-out forwards',
        'toast-exit': 'toastExit 0.3s ease-in forwards',
        'flame-flicker': 'flameFlicker 0.5s ease-in-out infinite',
        'scale-up': 'scaleUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        // WB010: Sparkle animation for piece unlock celebration
        'sparkle': 'sparkle 1.5s ease-out forwards',
        // UI008: Tier upgrade celebration animations
        'tier-particle': 'tierParticle 1.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        // WB020: Evolution celebration animation
        'evolution-particle': 'evolutionParticle 1.5s ease-out forwards',
        // Mic pulse animation for selected level cards
        'pulse-mic': 'pulseMic 2s ease-in-out infinite',
        // GAMIFY-004: Mission UI animations
        'claim': 'claim 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'bounce-once': 'bounceOnce 0.6s ease-out',
        'fade-out-down': 'fadeOutDown 0.3s ease-in forwards',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
        // POLISH-001: Confetti falling animation (T001, T002)
        confettiFall: {
          '0%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(100vh) rotate(720deg)',
            opacity: '0',
          },
        },
        // POLISH-001: Toast enter/exit animations
        toastEnter: {
          '0%': { transform: 'translate(-50%, -100%)', opacity: '0' },
          '100%': { transform: 'translate(-50%, 0)', opacity: '1' },
        },
        toastExit: {
          '0%': { transform: 'translate(-50%, 0)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -100%)', opacity: '0' },
        },
        // POLISH-001: Flame flicker animation (T003)
        flameFlicker: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '25%': { transform: 'scale(1.05) rotate(-2deg)', opacity: '0.9' },
          '50%': { transform: 'scale(0.98) rotate(1deg)', opacity: '1' },
          '75%': { transform: 'scale(1.03) rotate(-1deg)', opacity: '0.95' },
        },
        // POLISH-001: Scale up animation for streak number (T004)
        scaleUp: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        // Bounce in for celebration
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // WB010: Sparkle particle animation for piece unlock
        sparkle: {
          '0%': {
            transform: 'scale(0) rotate(0deg)',
            opacity: '0',
          },
          '20%': {
            transform: 'scale(1.2) rotate(45deg)',
            opacity: '1',
          },
          '50%': {
            transform: 'scale(1) rotate(90deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(0) rotate(180deg)',
            opacity: '0',
          },
        },
        // UI008: Tier particle animation - particles radiate outward
        tierParticle: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
            opacity: '0',
          },
          '20%': {
            transform: 'translate(-50%, -50%) scale(1.5) rotate(45deg)',
            opacity: '1',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(1.2) rotate(90deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(180deg)',
            opacity: '0',
          },
        },
        // UI008: Fade in up animation for text reveals
        fadeInUp: {
          '0%': {
            transform: 'translateY(20px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        // WB020: Evolution particle animation - sparkles radiate outward and fade
        evolutionParticle: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
            opacity: '0',
          },
          '30%': {
            transform: 'translate(-50%, -50%) scale(1.5) rotate(90deg)',
            opacity: '1',
          },
          '60%': {
            transform: 'translate(-50%, -50%) scale(1.2) rotate(180deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(0) rotate(360deg)',
            opacity: '0',
          },
        },
        // Mic pulse animation keyframes
        pulseMic: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
        // GAMIFY-004: Mission UI keyframes
        claim: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.05)' },
          '60%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceOnce: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeOutDown: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(20px)', opacity: '0' },
        },
      },
      // Curious Explorer: Kid-friendly gradients
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B4A 0%, #FFB830 100%)',
        'gradient-success': 'linear-gradient(135deg, #4ADE80 0%, #00B4A0 100%)',
        'gradient-mastery': 'linear-gradient(135deg, #00B4A0 0%, #60A5FA 100%)',
        'gradient-streak': 'linear-gradient(135deg, #FFB830 0%, #FF6B4A 100%)',
        'gradient-ambient': 'radial-gradient(ellipse at top, #FFF5EE 0%, #FFF9F5 100%)',
      },
    },
  },
  plugins: [],
}
