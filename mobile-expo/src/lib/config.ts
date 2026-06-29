// API/WS base URLs. Host resolution order: EXPO_PUBLIC override, then the live
// Metro host, then the LAN IP baked at build time, then the emulator alias.
import Constants from 'expo-constants';

// Pull the host part out of the Metro dev-server URI, across SDK shapes.
function devHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.developer?.host ??
    (Constants as any).manifest?.debuggerHost ??
    null;
  if (!hostUri) return null;
  const host = String(hostUri).split('://').pop()!.split('/')[0].split(':')[0].trim();
  return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
}

// LAN IP baked at build time by app.config.js — the host a release APK uses.
function bakedHost(): string | null {
  const extra =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ??
    ((Constants as any).manifest?.extra as Record<string, unknown> | undefined);
  const host = extra?.lanHost;
  return typeof host === 'string' && host ? host : null;
}

function baseUrl(envValue: string | undefined, scheme: string, port: number, path = ''): string {
  if (envValue) return envValue;
  const host = devHost() ?? bakedHost() ?? '10.0.2.2';
  return `${scheme}://${host}:${port}${path}`;
}

export const config = {
  apiUrl: baseUrl(process.env.EXPO_PUBLIC_API_URL, 'http', 8001, '/api'), // Laravel
  coreUrl: baseUrl(process.env.EXPO_PUBLIC_CORE_URL, 'http', 8080),       // Go core
  wsUrl: baseUrl(process.env.EXPO_PUBLIC_WS_URL, 'ws', 8080, '/ws'),      // realtime
  // One codebase, two builds: 'courier' (default) or 'catering'.
  appRole: (process.env.EXPO_PUBLIC_APP_ROLE ?? 'courier') as 'courier' | 'catering',
} as const;
