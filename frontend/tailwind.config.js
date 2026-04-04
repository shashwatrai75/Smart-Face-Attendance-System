/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    '!bg-green-500', '!text-white',
    '!bg-yellow-400', '!text-gray-900',
    '!bg-red-500',
    'animate-dashboard-in',
    'animate-dashboard-in-delay',
    'animate-dashboard-in-delay-2',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      keyframes: {
        dashboardIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'dashboard-in': 'dashboardIn 0.55s ease-out both',
        'dashboard-in-delay': 'dashboardIn 0.55s ease-out 0.1s both',
        'dashboard-in-delay-2': 'dashboardIn 0.55s ease-out 0.2s both',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

