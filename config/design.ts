// Design tokens for the "Editorial Utility" language (spec §9).
// Read the frontend-design skill before building UI; apply these tokens over its defaults.
export const DESIGN = {
  color: {
    bg: '#F7F5F0',
    ink: '#1B1B18',
    accent: '#C4552D', // clay — the ONLY accent. Use sparingly.
    warn: '#B8860B', // ochre. Never alarm-red.
    rule: '#D8D5CC',
    dark: { bg: '#161614', ink: '#EDEAE2' },
  },
  font: {
    display: 'Space Grotesk',
    body: 'Inter',
    mono: 'IBM Plex Mono',
  },
  radius: '2px',
  shadow: 'none',
} as const;
