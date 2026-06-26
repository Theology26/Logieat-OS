// Premium gold-on-black theme (cohesive with the landing; not generic AI indigo).
export const theme = {
  color: {
    bg: '#070605',          // warm near-black
    raised: '#15120b',      // warm dark card
    overlay: '#1d1810',
    line: '#2a2418',
    line2: '#3a3220',
    ink: '#f6f1e6',         // warm white
    ink2: '#a99f8b',        // warm muted
    inverse: '#120d03',     // dark text on gold buttons (high contrast)
    accent: '#e8b54a',      // gold — primary actions, active
    accentH: '#f3c75e',
    accentT: '#ffd277',     // gold for text/icons on dark
    accentSub: 'rgba(232,181,74,0.14)',
    danger: '#ff5a4d',
    warning: '#ff9f0a',
    success: '#34c759',
    risk: { critical: '#ff5a4d', high: '#ff9f0a', medium: '#ffd60a', low: '#34c759' },
  },
  space: { s1: 5, s2: 12, s3: 14, s4: 16, s5: 24, s6: 32 },
  radius: { sm: 8, xs: 12, md: 60, lg: 100, full: 9999 },
  touch: { min: 48, primary: 56 },
} as const;

export const riskColor = (r: string) =>
  (theme.color.risk as Record<string, string>)[r] ?? theme.color.ink2;
