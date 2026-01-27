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
        // POLISH-002: Updated color palette for student-focused branding
        primary: {
          DEFAULT: '#6366F1', // Indigo
          dark: '#818CF8',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        // T001: Primary gradient colors
        cyan: {
          DEFAULT: '#06B6D4',
          dark: '#22D3EE',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#1E293B',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
        // T002: Accent orange color
        accent: {
          DEFAULT: '#F59E0B', // Orange for accents
          dark: '#FBBF24',
          orange: '#F59E0B',
        },
        // T003: Success green for streaks
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
        // Streak gradient colors (orange to red)
        streak: {
          orange: '#F59E0B',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
      },
      // T004: Gradient backgrounds for mic button
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366F1, #06B6D4)',
        'gradient-streak': 'linear-gradient(135deg, #F59E0B, #EF4444)',
        'gradient-success': 'linear-gradient(135deg, #22C55E, #06B6D4)',
      },
    },
  },
  plugins: [],
}
