# DARS: Dhaka Auto-Rickshaw Registration System

Authorized officers register unregistered auto-rickshaws in Dhaka: each rickshaw gets an alphanumeric number,
a photo, an owner and a registered driver (alphanumeric driver code, photo, NID and other identification).
See [docs/PRD.md](docs/PRD.md) for the full requirements.

| Part | Path | Stack |
|---|---|---|
| Backend API | `backend/` | Spring Boot 4.1, Java 21, Spring Security (JWT), JPA, Flyway, H2 (dev) / PostgreSQL (prod) |
| Web app (office) | `web/` | React 19, Vite, TypeScript, MUI 9, TanStack Query, React Hook Form + Zod |
| Mobile app (field) | `mobile/` | React Native via Expo SDK 57, Expo Router, TypeScript |

## Run it locally

### 1. Backend (port 8080)

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

- Dev data lives in an H2 file database at `backend/data/` and photos in `backend/uploads/`.
- First start creates the admin account **admin / Admin@12345**. Change it after signing in.
  (Set `DARS_ADMIN_USERNAME` / `DARS_ADMIN_PASSWORD` before the first start to choose your own.)
- API docs: http://localhost:8080/swagger-ui
- Production: `--spring.profiles.active=prod` with `DARS_DB_URL`, `DARS_DB_USERNAME`, `DARS_DB_PASSWORD`,
  `DARS_JWT_SECRET` (≥ 32 bytes), `DARS_ADMIN_PASSWORD`, `DARS_CORS_ORIGINS` and `DARS_PUBLIC_BASE_URL`.
  `docker compose up -d` starts a matching PostgreSQL 16.

### 2. Web app (port 5173)

```bash
cd web
npm install
npm run dev                     # proxies /api to localhost:8080
```

Open http://localhost:5173, sign in as admin, add officer accounts under **Officers**.

### 3. Mobile app

```bash
cd mobile
npm install
npx expo start                  # press a (Android), i (iOS) or w (web)
```

The app calls `http://localhost:8080/api/v1` by default. On a phone or emulator, point it at your computer:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080/api/v1 npx expo start   # phone on the same Wi-Fi
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1 npx expo start       # Android emulator
```

Also add the app's origin to `DARS_CORS_ORIGINS` if you use the web target from another host.

## Tests

```bash
cd backend && ./mvnw test        # validation unit tests + full API flow on in-memory H2
cd web && npm test && npm run build
cd mobile && npm test && npx tsc --noEmit && npx expo lint
```

## Roles

- **Admin:** manages officer accounts, changes rickshaw/driver status, sees the audit log, edits any record.
- **Officer:** registers drivers, owners and rickshaws; edits their own records for 24 hours; searches everything.

Every create, update, status change and sign-in is written to the audit log.
