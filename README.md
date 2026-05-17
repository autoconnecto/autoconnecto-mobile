# Autoconnecto Mobile

Android companion for Autoconnecto monitoring: dashboards (charts + gauges), live telemetry, and alarms (ack/clear). Same Cognito login and production API as the web app.

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

Prerequisites: Node 20+, JDK 21, Android SDK (or Android Studio).

```bash
npm install
npm run build
npm run cap:sync
cd android && ./gradlew assembleRelease
```

Release APK path: `android/app/build/outputs/apk/release/app-release.apk`

Or open Android Studio: `npm run cap:open:android` → **Build → Build APK(s)**.

Install from [GitHub Releases](https://github.com/autoconnecto/autoconnecto-mobile/releases) (tag `v*` builds APK in CI).

### Phone install

1. Download **`autoconnecto-mobile-v1.4.0.apk`** (or latest from Releases).
2. Open **Files** / **Downloads** and tap the APK (not Chrome’s download chip).
3. Choose **Package installer** if prompted.
4. Allow **Install unknown apps** for Files when asked.
5. If Play Protect warns, tap **Install anyway**.

## v1.4 dashboard support (mobile)

| Category | Widget types |
|----------|----------------|
| Charts | timeseries, multitimeseries, bar, pie, doughnut, sparkline |
| Gauges / values | gauge family, tank, battery, signal, LED, KPI, multigauge |
| Alarms | alarm, deviceAlarm, alarmSummary |
| Other | deviceCount; complex maps/tables → open on web |

## CI

`.github/workflows/release-android.yml` builds a signed debug-release APK on tags `v*` and publishes a GitHub Release.
