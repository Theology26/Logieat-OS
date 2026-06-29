// Premium gold-on-warm theme. Dark is the original/default; light mirrors it with
// the same gold identity at light-safe contrast (body text ≥4.5:1). Both share the
// same shape so a screen can switch palette purely by swapping `color`.
// Live theme is provided via ThemeProvider/useTheme (src/lib/theme-context.tsx).

export type ThemeMode = 'dark' | 'light';

export type Palette = {
  bg: string;
  raised: string;
  overlay: string;
  line: string;
  line2: string;
  ink: string;
  ink2: string;
  inverse: string;
  accent: string;
  accentH: string;
  accentT: string;
  accentSub: string;
  danger: string;
  warning: string;
  success: string;
  risk: { critical: string; high: string; medium: string; low: string };
};

const darkColor: Palette = {
  bg: '#070605',          // warm near-black
  raised: '#15120b',      // warm dark card
  overlay: '#1d1810',
  line: '#2a2418',
  line2: '#3a3220',
  ink: '#f6f1e6',         // warm white
  ink2: '#a99f8b',        // warm muted
  inverse: '#120d03',     // dark text on gold buttons (high contrast, both modes)
  accent: '#e8b54a',      // gold — primary actions, active
  accentH: '#f3c75e',
  accentT: '#ffd277',     // gold for text/icons on dark
  accentSub: 'rgba(232,181,74,0.14)',
  danger: '#ff5a4d',
  warning: '#ff9f0a',
  success: '#34c759',
  risk: { critical: '#ff5a4d', high: '#ff9f0a', medium: '#ffd60a', low: '#34c759' },
};

const lightColor: Palette = {
  bg: '#f7f3ea',          // warm cream
  raised: '#ffffff',
  overlay: '#efe8d8',
  line: '#e6ddca',
  line2: '#d6cbb0',
  ink: '#1d1812',         // warm near-black
  ink2: '#6a6253',        // warm muted, ≥4.5:1 on cream
  inverse: '#120d03',     // dark text on gold buttons (gold fill stays in light)
  accent: '#c8961f',      // deeper gold so fills/active read on light
  accentH: '#b8861a',
  accentT: '#9a6f12',     // gold text on light, ≥4.5:1 on cream
  accentSub: 'rgba(200,150,31,0.14)',
  danger: '#d33a2c',
  warning: '#b5791b',
  success: '#1f9b45',
  risk: { critical: '#d33a2c', high: '#b5791b', medium: '#9a7d0a', low: '#1f9b45' },
};

const shared = {
  space: { s1: 5, s2: 12, s3: 14, s4: 16, s5: 24, s6: 32 },
  radius: { sm: 8, xs: 12, md: 60, lg: 100, full: 9999 },
  touch: { min: 48, primary: 56 },
} as const;

export type Theme = typeof shared & { mode: ThemeMode; color: Palette };

export const darkTheme: Theme = { mode: 'dark', color: darkColor, ...shared };
export const lightTheme: Theme = { mode: 'light', color: lightColor, ...shared };

export const themes: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme };

// Backwards-compatible default export (dark). Prefer useTheme() for live switching.
export const theme = darkTheme;

export const riskColor = (r: string, t: Theme = darkTheme) =>
  (t.color.risk as Record<string, string>)[r] ?? t.color.ink2;
