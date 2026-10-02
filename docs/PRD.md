# Dhaka Auto-Rickshaw Registration System (DARS): PRD & Build Plan

## Context
Thousands of battery-run auto-rickshaws in Dhaka operate unregistered, so authorities can't identify a vehicle or its driver. DARS lets **authorized officers** register each auto-rickshaw (alphanumeric number + photo) and its driver (alphanumeric driver ID, photo, identification details) from the office (web) and from the field (mobile). The working directory `C:\Users\BA\IdeaProjects\Claude Practice` is empty, so this is a from-scratch build. The user asked for: **Java backend → React web → Node.js-toolchain mobile app**, built in that order, plus a detailed PRD.

On approval, step 1 is saving this PRD as `docs/PRD.md` in the repo.

---

## Feedback on the requirements (assumptions made)
1. **Mobile = React Native** (confirmed by the user). It's TypeScript, built with the **Expo** framework, the officially recommended way to start React Native apps. Expo gives camera, secure storage and QR scanning without native setup and can still produce standalone Android/iOS builds. Validation and API-client code are shared with the React web app.
2. **"Driver, alphanumeric"** is read as a system-generated **Driver Code** (e.g. `DRV-2026-000123`) linked to the rickshaw, separate from the driver's name and NID.
3. **Rickshaw number**: unregistered vehicles have no official plate, so DARS **issues** a number (e.g. `DHK-AR-000123`) by default. Officers can also enter an existing local/union number, which must be unique and alphanumeric (`^[A-Z0-9-]{3,20}$`).
4. **"Authorized person"** means role-based access: **Admin** manages officers; **Officer** registers. Every record keeps `registeredBy` and `registeredAt`, and an audit log records all changes.
5. **One active driver per rickshaw**; a driver can drive at most one rickshaw at a time. Reassignment is allowed and history is kept.
6. **Missing items worth adding**: the owner of the rickshaw (often not the driver), duplicate detection by NID, a printable registration card/sticker with a QR code, and Bangla + English UI. The owner and QR card are in scope; Bangla i18n is set up but strings are English first.
7. **Privacy**: NID and photos are personal data. They're served only to authenticated users, uploads are size/type-checked, and nothing is public.

---

## 1. Product Requirements

### 1.1 Users & roles
| Role | Can |
|---|---|
| ADMIN | Everything; create/disable officers; edit/suspend any record; view audit log |
| OFFICER | Register drivers, owners and rickshaws; edit own records within 24h; search/view all |
| (Public) | Nothing. All endpoints require login except `/auth/login` and a QR verify endpoint that returns only number, status and photo thumbnail |

### 1.2 Functional requirements
- **FR-1 Auth**: username/password login, JWT access token (15 min) + refresh token (7 days), logout, change password. Lockout after 5 failed attempts for 15 min.
- **FR-2 Officer management** (Admin): create, list, disable/enable, reset password. A seeded admin is created on first boot from env vars.
- **FR-3 Driver registration form** (identification properties):
  - Required: full name, father's/husband's name, date of birth (age ≥ 18), gender, **NID number** (10 or 17 digits, unique), mobile (`^01[3-9]\d{8}$`), present address, permanent address (division/district/thana/area + line), **driver photo** (JPEG/PNG, ≤ 2 MB)
  - Optional: driving licence number, blood group, emergency contact name/phone, NID front/back scans
  - System: `driverCode` (generated, alphanumeric, unique), status (ACTIVE/SUSPENDED/BLACKLISTED), registeredBy/At
- **FR-4 Owner**: name, NID, mobile, address. It can be the same person as the driver (checkbox that copies the driver's data).
- **FR-5 Rickshaw registration**: `rickshawNumber` (issued or entered, alphanumeric, unique), chassis/motor number (optional), color, manufacturer/model (optional), operating area/thana, **rickshaw photo** (required; optional second photo of the rear), owner, **assigned driver** (required), status (ACTIVE/SUSPENDED/IMPOUNDED).
- **FR-6 Driver assignment**: assign/reassign a driver to a rickshaw; each assignment has from/to dates; one active assignment per rickshaw and per driver.
- **FR-7 Search & list**: paginated, filterable by number, driver code, NID, mobile, thana, status and date range.
- **FR-8 Detail views**: rickshaw + current driver + owner + photos + assignment history; driver + current rickshaw.
- **FR-9 Registration card**: printable PDF/HTML card with photo, number, driver code and a QR code linking to the verify endpoint.
- **FR-10 Audit log**: who did what and when (create/update/status change/login), viewable by Admin.
- **FR-11 Dashboard**: totals, registrations per day/thana, top officers.
- **FR-12 Mobile field capture**: register with the camera and look up by number or QR scan. Offline drafts are queued and synced when online (phase 3b).

### 1.3 Non-functional requirements
- Photos are compressed client-side to ≤ 1600 px / ~500 KB; the server rejects files over 2 MB or with a bad content type (magic-byte check).
- p95 API latency < 300 ms for lists of 20; works on 3G.
- Passwords use BCrypt; HTTPS in prod; CORS limited to the web origin; input validated on both client and server.
- OpenAPI docs at `/swagger-ui`.
- Test coverage: services ≥ 80%.

---

## 2. Architecture
```
Claude Practice/
  docs/PRD.md
  backend/   Spring Boot 3.3, Java 21, Maven wrapper
  web/       React 18 + Vite + TypeScript
  mobile/    React Native (Expo) + TypeScript
  docker-compose.yml  (PostgreSQL 16 for dev)
```
React web and React Native mobile → REST/JSON + JWT → Spring Boot → PostgreSQL. Photos go to local disk (`STORAGE_DIR`) behind a `StorageService` interface so S3/MinIO can be swapped in later.

### 2.1 Backend (`backend/`, package `bd.dhaka.dars`)
- **Dependencies**: spring-boot-starter-web, -security, -data-jpa, -validation, -actuator; Flyway; PostgreSQL driver; H2 (tests); jjwt; springdoc-openapi; MapStruct; Lombok; ZXing (QR); OpenPDF (card).
- **Packages**: `config` (SecurityConfig, JwtFilter, CorsConfig, DataSeeder), `auth`, `user`, `driver`, `owner`, `rickshaw`, `assignment`, `storage`, `audit`, `dashboard`, `common` (ApiError, GlobalExceptionHandler, PageResponse). Each feature package has its own entity, repository, service, controller and DTOs.
- **Data model** (Flyway `V1__init.sql`):
  - `app_user(id, username uq, password_hash, full_name, role, enabled, failed_attempts, locked_until, created_at)`
  - `driver(id, driver_code uq, full_name, father_name, dob, gender, nid uq, licence_no, mobile, present_addr jsonb/cols, permanent_addr, blood_group, emergency_name, emergency_phone, photo_id, nid_front_id, nid_back_id, status, registered_by, registered_at, updated_at)`
  - `owner(id, full_name, nid uq, mobile, address, created_by, created_at)`
  - `rickshaw(id, rickshaw_number uq, chassis_no, motor_no, color, model, thana, photo_id, rear_photo_id, owner_id, status, registered_by, registered_at, updated_at)`
  - `assignment(id, rickshaw_id, driver_id, from_date, to_date null)` with partial unique indexes where `to_date is null`
  - `photo(id uuid, path, content_type, size, uploaded_by, uploaded_at)`
  - `audit_log(id, actor_id, action, entity, entity_id, details jsonb, at)`
  - Sequences for `driver_code` and `rickshaw_number`
- **REST API** (`/api/v1`):
  - `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`
  - `GET|POST /users`, `PATCH /users/{id}` (enable/disable/reset). ADMIN only.
  - `POST /photos` (multipart) → `{id}`; `GET /photos/{id}` (auth)
  - `GET|POST /drivers`, `GET|PUT /drivers/{id}`, `PATCH /drivers/{id}/status`, `GET /drivers/check-nid?nid=`
  - `GET|POST /owners`, `GET|PUT /owners/{id}`
  - `GET|POST /rickshaws`, `GET|PUT /rickshaws/{id}`, `PATCH /rickshaws/{id}/status`, `GET /rickshaws/next-number`
  - `POST /rickshaws/{id}/assignments` (reassign), `GET /rickshaws/{id}/assignments`
  - `GET /rickshaws/{id}/card.pdf`, `GET /public/verify/{number}`
  - `GET /audit` (ADMIN), `GET /dashboard/summary`
- **Errors**: a uniform `{code, message, fieldErrors[]}` body; 409 on duplicate NID/number.

### 2.2 Web (`web/`)
- Vite + React 18 + TS, React Router, TanStack Query, Axios (JWT interceptor with refresh), React Hook Form + Zod, MUI, react-i18next (en/bn), Recharts (dashboard).
- **Pages**: Login, Dashboard, Drivers (list/new/detail/edit), Owners, Rickshaws (list/new wizard: owner → driver → vehicle+photo → review, detail with card print), Users (admin), Audit (admin).
- Photo input: file upload or webcam capture, with client-side resize before upload.
- Route guards by role.

### 2.3 Mobile (`mobile/`): React Native
- React Native via Expo SDK (latest, `npx create-expo-app`), TypeScript, Android-first (most field officers use Android), Expo Router, TanStack Query, React Hook Form + Zod, expo-camera / expo-image-picker / expo-image-manipulator (compress), expo-secure-store (tokens), expo-barcode-scanner (QR lookup).
- **Screens**: Login, Home (quick actions), Register Driver, Register Rickshaw (camera-first), Search/Scan, Detail, Drafts (offline queue, phase 3b).
- Shared Zod schemas copied from `web/src/schemas` (a shared package is optional later).

---

## 3. Delivery Plan (TDD throughout; each phase ends green and demoable)
**Phase 1: Backend**
1. Scaffold Maven project, docker-compose Postgres, Flyway V1, health check
2. Auth: User entity, BCrypt, JWT login/refresh, SecurityConfig, seeded admin, lockout
3. User management (admin)
4. Photo upload/storage with validation
5. Driver CRUD + validation + NID uniqueness + code generation
6. Owner CRUD
7. Rickshaw CRUD + number issuing + assignment/reassignment
8. Search/filter/pagination, audit log, dashboard, QR card PDF, public verify
9. OpenAPI review; integration tests with MockMvc + H2 (Postgres mode)

**Phase 2: Web**: scaffold → auth/guards → layout → drivers → owners → rickshaw wizard → search/detail/card → admin users/audit → dashboard → i18n

**Phase 3: Mobile**: (3a) scaffold → login → register driver/rickshaw with camera → search/QR scan → detail; (3b) offline drafts + sync

---

## 4. Verification
- **Backend**: `cd backend && ./mvnw verify` runs unit tests (validators: number regex, NID 10/17, mobile, age ≥ 18; services: uniqueness, single active assignment) and integration tests (401 without token, 403 for officer on `/users`, full register flow, 409 duplicates, oversized photo rejected). Manual pass: `./mvnw spring-boot:run`, then Swagger UI.
- **Web**: `npm run test` (Vitest + Testing Library for forms/validation) and `npm run build`. With the backend running, an end-to-end Playwright pass logs in as admin, creates an officer, logs in as the officer, registers a driver with a photo, registers a rickshaw, prints the card, and searches.
- **Mobile**: `npx tsc --noEmit` and Jest for schemas/API client; run with `npx expo start` (web target or Expo Go) against the local backend to register a driver and rickshaw with camera/gallery photos and look up by number.

## 5. Open items (defaults chosen; change any time)
- PostgreSQL via Docker for dev (fallback: H2 file DB if Docker isn't installed)
- Number format `DHK-AR-NNNNNN`, driver code `DRV-YYYY-NNNNNN`
- Out of scope for v1: payments/fees, the SMS gateway, the citizen-facing portal, and the supervisor approval workflow

---

## 6. Implementation notes (as built, 2026-10-02)

Differences from the plan above, and why:

- **Versions:** Spring Boot **4.1.1** (not 3.3), React **19** + MUI **9**, Expo SDK **57**. These were the current stable releases at build time.
- **Database in dev:** Docker was not available on the build machine, so dev uses an **H2 file database in PostgreSQL mode** (the planned fallback). Flyway SQL is portable; `docker-compose.yml` and the `prod` profile target PostgreSQL 16 but have not been exercised yet.
- **"One active assignment" rule** is enforced in `AssignmentService`, not by partial unique indexes, because those aren't portable to H2.
- **`GET /rickshaws/next-number` was dropped.** A sequence can't be previewed without consuming it, so the UI says "leave blank and a DHK-AR number will be issued" instead.
- **Added `GET /rickshaws/by-number/{number}`**, used by the mobile QR scanner.
- **No MapStruct.** DTO mapping is a few lines per record, so it's written by hand.
- **Photos in the web app** are fetched as blobs with the bearer token. On mobile, native `Image` sends the header directly.
- **Shared validation:** `web/src/schemas.ts` is copied to `mobile/src/lib/schemas.ts` and mirrors `backend/.../common/Patterns.java`.
- **Phase 3b (offline drafts and sync) is not built yet.** The mobile app needs a connection to register.
