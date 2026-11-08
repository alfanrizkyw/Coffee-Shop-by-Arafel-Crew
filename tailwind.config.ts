import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#081511',
          900: '#0C1F18',
          850: '#10281E',
          800: '#143124',
          750: '#1A3B2C',
          700: '#215038',
          600: '#2B6A47',
          500: '#35855A',
          400: '#4CA372',
          300: '#7CC49A',
          200: '#ABDCC0',
        },
        cream: {
          DEFAULT: '#F1E9D6',
          dim: '#C9C2AE',
        },
        moss: '#9FB6A8',
        wood: {
          300: '#E3C08D',
          400: '#D9A441',
          500: '#C08A3E',
          600: '#9A6B2F',
        },
        danger: '#E5484D',
        ok: '#46A758',
        sky: '#4CC3FF',
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-work-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.4)',
        sheet: '0 -8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};

export default config;