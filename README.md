# Autoconnecto Mobile

Lightweight Android companion for Autoconnecto monitoring: live telemetry and alarms (ack/clear). Uses the same Cognito pool and production API as the web app.

## v1 scope

- Sign in (AWS Cognito)
- Device-scoped telemetry (REST snapshot + Socket.IO live updates)
- Alarms list with acknowledge and clear
- No backend or web frontend deploy changes required

## Production endpoints

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://api.autoconnecto.in` |
| `VITE_WS_BASE_URL` | `https://api.autoconnecto.in` |
| Socket.IO path | `/socket.io` |

## Web development

```bash
npm install
npm run dev
```

Open `http://localhost:5174` and sign in with your Autoconnecto user.

## Android APK (Capacitor)

Prerequisites: Node 20+, Android Studio, JDK 21.

```bash
npm install
npm run build
npx cap add android   # first time only
npm run cap:sync
npm run cap:open:android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Install the APK from [GitHub Releases](https://github.com/autoconnecto/autoconnecto-mobile/releases).

### Phone install

**If tapping the download shows “Open with” (Chrome, Photos, etc.) — that is normal on some phones. Do not open the APK with Chrome.**

1. Open the **Files** app (Google Files / Samsung My Files), go to **Downloads**.
2. Tap the APK file there (not from Chrome’s download chip).
3. If you still see **Open with**, choose **Package installer** (or **Install** / **App installer**). **Not Chrome.**
4. If **Package installer** is not listed: long-press the file → **Rename** → ensure the name ends with **`.apk`** → tap again.
5. Allow **Install unknown apps** for **Files** when asked.
6. If **Play Protect** warns, tap **Install anyway**.
7. Prefer the latest release asset: **`autoconnecto-mobile-v1.0.2.apk`** from [Releases](https://github.com/autoconnecto/autoconnecto-mobile/releases).

## CI

`.github/workflows/release-android.yml` builds a release APK on tagged releases (`v*`).

## Future

Architecture uses tabbed screens and feature modules so dashboard widgets can be added later without restructuring auth or realtime.
