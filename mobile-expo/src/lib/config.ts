// Runtime config. EXPO_PUBLIC_* are inlined at build time (and into the APK).
// See docs/API.md §1 for which URL to use per environment.

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8001/api', // Laravel
  coreUrl: process.env.EXPO_PUBLIC_CORE_URL ?? 'http://10.0.2.2:8080',    // Go core
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? 'ws://10.0.2.2:8080/ws',       // realtime
  // APP_ROLE picks which app this build is: 'courier' (default) or 'catering'.
  // One codebase → two APKs (build each with EXPO_PUBLIC_APP_ROLE set).
  appRole: (process.env.EXPO_PUBLIC_APP_ROLE ?? 'courier') as 'courier' | 'catering',
} as const;
