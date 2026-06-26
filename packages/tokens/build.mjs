// Generate platform token files from tokens.json (run: node build.mjs)
// Outputs: dist/theme.ts (React Native) + dist/tokens.css (web vars) + dist/tailwind.tokens.cjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

/* ---------- React Native theme.ts ---------- */
const theme = {
  color: t.color, space: t.space, radius: t.radius, font: t.font, touch: t.touch,
};
const ts = `// AUTO-GENERATED from tokens.json — do not edit by hand. Run \`node build.mjs\`.
export const theme = ${JSON.stringify(theme, null, 2)} as const;
export type Theme = typeof theme;
`;
writeFileSync(join(dist, 'theme.ts'), ts);

/* ---------- Web CSS variables ---------- */
const lines = [':root{'];
const flat = (obj, prefix) => {
  for (const [k, v] of Object.entries(obj)) {
    const name = `${prefix}-${k}`;
    if (v && typeof v === 'object') flat(v, name);
    else lines.push(`  --${name}: ${typeof v === 'number' && !/font|weight|base/.test(name) ? v + 'px' : v};`);
  }
};
flat(t.color, 'color');
flat(t.radius, 'radius');
flat(t.space, 'space');
lines.push(`  --font: '${t.font.family}', system-ui, sans-serif;`);
lines.push(`  --font-mono: '${t.font.mono}', monospace;`);
lines.push('}');
writeFileSync(join(dist, 'tokens.css'), lines.join('\n') + '\n');

/* ---------- Tailwind theme fragment ---------- */
const tw = `// AUTO-GENERATED from tokens.json. Spread into tailwind.config theme.extend.
module.exports = {
  colors: ${JSON.stringify(t.color, null, 2)},
  borderRadius: ${JSON.stringify(t.radius, null, 2)},
  spacing: ${JSON.stringify(t.space, null, 2)},
  fontFamily: { sans: ['${t.font.family}','sans-serif'], mono: ['${t.font.mono}','monospace'] },
};
`;
writeFileSync(join(dist, 'tailwind.tokens.cjs'), tw);

console.log('✓ tokens built → dist/theme.ts, dist/tokens.css, dist/tailwind.tokens.cjs');
