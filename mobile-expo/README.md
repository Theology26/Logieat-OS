# mobile-expo — LogiEat OS Courier App

React Native (Expo SDK 56). Courier app: splash → landing → auth → tasks → navigation (MapLibre +
OSRM, bottom sheet) → PoD camera → chat. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §7.1.

## Status (2026-06-26)
**Built & verified (tsc + bundles):** Splash → Landing → **Login** (courier) → **Tasks** (live AI
route from `GET /api/courier/tasks`). Dark theme from design tokens (`src/theme.ts`), API client
(`src/lib/api.ts`). Runs in **Expo Go**.
**Next (need a custom dev build — not Expo Go):** map navigation (MapLibre RN), PoD camera
(expo-camera), realtime chat/GPS (Phase 3 WS), FCM push.

## Run
```bash
cp .env.example .env                 # then set EXPO_PUBLIC_API_URL (see below)
npx expo start                       # scan QR with Expo Go, or press 'a' for Android emulator
```
**Pick the API URL** (`.env` → `EXPO_PUBLIC_API_URL`), and make sure Laravel + Go + app.py are running:
- Emulator → `http://10.0.2.2:8001/api`
- **Real phone / APK** → `http://<PC-LAN-IP>:8001/api`; run Laravel with `php artisan serve --host=0.0.0.0 --port=8001`
- Anywhere → ngrok. Details: [`../docs/API.md`](../docs/API.md) §1.

Demo courier login: `joni@sehat.id` / `secret1` (has an assigned AI route).

## Build APK (final project — no Play Store)
```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview     # cloud build → installable .apk
```
Set `EXPO_PUBLIC_API_URL` to a URL the phone can reach (LAN IP or ngrok) **before** building, since
`EXPO_PUBLIC_*` is baked into the APK. Host the .apk behind the landing page download button.

---

## Bootstrap (already done — for reference)
```bash
npx create-expo-app@latest .            # TypeScript template
# core deps
npx expo install expo-router expo-image expo-camera expo-location expo-sqlite expo-secure-store
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler zustand
npm install @maplibre/maplibre-react-native lottie-react-native react-native-toast-message
npm install @react-navigation/native @react-navigation/native-stack
npm install @react-native-firebase/app @react-native-firebase/messaging   # FCM (needs dev build)
```

## API connectivity (important for APK)
The API client is already stubbed in `src/lib/` (`config.ts`, `api.ts` — matches [`../docs/API.md`](../docs/API.md)).
Copy `.env.example` → `.env` and set the base URL for **how you run the app**:
- Emulator → `http://10.0.2.2:8001/api` · Real device/APK → `http://<PC-LAN-IP>:8001/api`
  (run Laravel `php artisan serve --host=0.0.0.0 --port=8001`) · anywhere → ngrok.
Native RN fetch isn't subject to CORS, so the APK calls Laravel/Go directly. Full details: `docs/API.md` §1.

## Wire our design tokens
1. `node ../packages/tokens/build.mjs`
2. Copy/symlink the theme into the app:
   ```ts
   // theme.ts
   export { theme } from '../packages/tokens/dist/theme';
   ```
   (or copy `dist/theme.ts` into `src/theme.ts`). Consume via `theme.color.*`, `theme.space.*`.
3. Fonts: load Inter + JetBrains Mono with `expo-font` (see design.md §2).

## Conventions (from design.md §3/§10 + ARCHITECTURE §7.1)
- TypeScript, functional components, `StyleSheet.create`, no inline styles in render.
- Touch targets ≥48dp; primary CTA 56dp in thumb zone; glass tab bar (Yellow Rattlesnake).
- `FlatList` + memoized rows for task/chat lists; `expo-image` with dimensions.
- Compress PoD photos client-side (`expo-image-manipulator`) before upload.
- Cache last route/coords in SQLite; queue GPS pings offline, flush on reconnect.
- Build screens to match [`../docs/mockups/mockups.html`](../docs/mockups/mockups.html) sections A & B.

## APK (final project — no Play Store)
```bash
npx eas build -p android --profile preview   # produces an installable APK
```
Host the APK behind the landing page "Download for Android" button (`../landing/`).
