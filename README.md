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

Prerequisites: Node 20+, Android Studio, JDK 17.

```bash
npm install
npm run build
npx cap add android   # first time only
npm run cap:sync
npm run cap:open:android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Install the APK from [GitHub Releases](https://github.com/autoconnecto/autoconnecto-mobile/releases) (ThingsBoard-style distribution for v1).

## CI

`.github/workflows/release-android.yml` builds a debug APK on tagged releases (`v*`). Upload the signed release APK manually until signing secrets are configured.

## Future

Architecture uses tabbed screens and feature modules so dashboard widgets can be added later without restructuring auth or realtime.
