// Two APKs from one codebase. Build courier (default) or catering by setting the role:
// courier : npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)
// catering: EXPO_PUBLIC_APP_ROLE=catering npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)
const os = require('os');
const base = require('./app.json').expo;
const isCatering = (process.env.EXPO_PUBLIC_APP_ROLE ?? 'courier') === 'catering';

// Detect this machine's LAN IPv4 at BUILD time so a release APK can reach the dev
// backend without anyone hand-editing an IP — rebuild and it follows your current
// Wi-Fi address automatically. We prefer real LAN ranges (192.168.* then 10.*) and
// skip virtual adapters (WSL/Docker 172.*) and link-local (169.254.*).
function detectLanHost() {
  const candidates = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const ni of addrs ?? []) {
      if (ni.family !== 'IPv4' || ni.internal) continue;
      if (ni.address.startsWith('169.254.')) continue; // link-local
      candidates.push(ni.address);
    }
  }
  const rank = (ip) =>
    ip.startsWith('192.168.') ? 3 :
    ip.startsWith('10.') ? 2 :
    ip.startsWith('172.') ? 0 : // WSL / Docker / Hyper-V — avoid
    1;
  candidates.sort((a, b) => rank(b) - rank(a));
  return candidates[0] ?? null;
}

// EXPO_PUBLIC_LAN_HOST lets you pin a host explicitly (e.g. CI / a fixed dev box);
// otherwise we auto-detect. Full overrides still win at runtime via EXPO_PUBLIC_API_URL.
const lanHost = process.env.EXPO_PUBLIC_LAN_HOST || detectLanHost();

module.exports = {
  ...base,
  name: isCatering ? 'LogiEat Manager' : 'LogiEat Kurir',
  slug: isCatering ? 'logieat-manager' : base.slug,
  android: {
    ...base.android,
    package: isCatering ? 'com.logieat.manager' : base.android.package,
  },
  extra: {
    ...(base.extra ?? {}),
    lanHost, // read at runtime by src/lib/config.ts as the no-Metro fallback host
  },
};
