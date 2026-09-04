import type { Config } from 'tailwindcss';
import { DESIGN } from './config/design';

const config: Config = {
  darkMode: 'media',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: DESIGN.color.bg,
        ink: DESIGN.color.ink,
        accent: DESIGN.color.accent,
        warn: DESIGN.color.warn,
        rule: DESIGN.color.rule,
        'dark-bg': DESIGN.color.dark.bg,
        'dark-ink': DESIGN.color.dark.ink,
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        DEFAULT: DESIGN.radius,
      },
      boxShadow: {
        none: DESIGN.shadow,
      },
    },
  },
  plugins: [],
};
export default config;
