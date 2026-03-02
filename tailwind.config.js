/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ── Dafolle Design System Colors ── */
      colors: {
        brand: {
          blue: { 1: '#335877', 2: '#B0CFE7' },
          pink: { 1: '#570045', 2: '#E9BEE0' },
          yellow: { 1: '#D08B00', 2: '#FFEDCA' },
          violet: { 1: '#8012C3', 2: '#E7C0FF' },
          green: { 1: '#0A211F', 2: '#B0D7BA' },
        },
        gray: {
          100: '#F9F9F9',
          200: '#F3F3F3',
          300: '#EAE7E4',
          400: '#BFBBB5',
          500: '#969390',
          600: '#686763',
          700: '#555452',
          800: '#2E2D2C',
        },
      },

      /* ── Font Families ── */
      fontFamily: {
        lastik: ['Lastik', 'Georgia', 'serif'],
        'inter-tight': ['"Inter Tight"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },

      /* ── Typography Scale (matches Figma Style Guide) ── */
      fontSize: {
        // Heading — Lastik (Brand)
        'h1-brand': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em' }],
        'h2-brand': ['60px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        'h3-brand': ['48px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
        'h4-brand': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        'h5-brand': ['30px', { lineHeight: '38px' }],
        'h6-brand': ['24px', { lineHeight: '32px' }],
        // Heading — Inter Tight (Classic)
        'h1-classic': ['72px', { lineHeight: '80px', letterSpacing: '-0.02em' }],
        'h2-classic': ['60px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        'h3-classic': ['48px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
        'h4-classic': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        // Body — Inter Tight
        'body-xl': ['20px', { lineHeight: '30px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'body-xs': ['12px', { lineHeight: '18px' }],
      },

      /* ── Spacing Tokens ── */
      spacing: {
        'ds-xs': '16px',
        'ds-sm': '24px',
        'ds-md': '40px',
        'ds-lg': '64px',
        'sp-md': '8px',
        'sp-lg': '12px',
        'sp-xl': '16px',
      },

      /* ── Border Radius ── */
      borderRadius: {
        'ds': '24px',
        'ds-pill': '9999px',
      },

      /* ── Shadows ── */
      boxShadow: {
        'ds-sm': '1px 2px 6px 0px rgba(52, 52, 52, 0.12)',
        'ds-md': '6px 12px 24px 0px rgba(52, 52, 52, 0.12)',
        'ds-lg': '4px 12px 24px 0px rgba(52, 52, 52, 0.2)',
        'ds-xl': '8px 20px 32px 0px rgba(52, 52, 52, 0.12)',
        'ds-2xl': '12px 24px 48px 0px rgba(52, 52, 52, 0.12)',
        'ds-card': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
      },
    },
  },
  plugins: [],
}