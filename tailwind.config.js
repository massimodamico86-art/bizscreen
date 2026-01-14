/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // BizScreen brand colors (inspired by Yodeck orange theme)
        brand: {
          50: '#FFF7F0',
          100: '#FFEDE0',
          200: '#FFD4B8',
          300: '#FFB080',
          400: '#FF8C48',
          500: '#F26F26',  // Primary brand color
          600: '#DE580D',  // Hover/active state
          700: '#B84A0A',
          800: '#923B08',
          900: '#6B2C06',
        },
        // Semantic colors for status
        status: {
          online: '#1BB783',
          offline: '#D35954',
          warning: '#F0AD4E',
          inactive: '#9CA3AF',
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      // Spacing extensions for Yodeck-like layout
      spacing: {
        'sidebar': '210px',
        'sidebar-collapsed': '60px',
        'header': '64px',
      },
      // Border radius matching Yodeck patterns
      borderRadius: {
        'pill': '9999px',
        'card': '12px',
      },
      // Box shadows matching Yodeck
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'focus-brand': '0 0 0 3px rgba(242, 111, 38, 0.3)',
      },
    },
  },
  plugins: [],
}
