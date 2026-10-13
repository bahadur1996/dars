# Dhaka Auto-Rickshaw Registration System (DARS): PRD & Build Plan

## Context
Thousands of battery-run auto-rickshaws in Dhaka operate unregistered, so authorities can't identify a vehicle or its driver. DARS lets **authorized officers** register each auto-rickshaw (alphanumeric number + photo) and its driver (alphanumeric driver ID, photo, identification details) from the office (web) and from the field (mobile). The working directory `C:\Users\BA\IdeaProjects\Claude Practice` is empty, so this is a from-scratch build. The user asked for: **Java backend → React web → Node.js-toolchain mobile app**, built in that order, plus a detailed PRD.

On approval, step 1 is saving this PRD as `docs/PRD.md` in the repo.

---

## Feedback on the requirements (assumptions made)
1. **Mobile = React Native** (confirmed by the user). It's TypeScript, built with the **Expo** framework, the officially recommended way to start React Native apps. Expo gives camera, secure storage and QR scanning without native setup and can still produce standalone Android/iOS builds. Validation and API-client code are shared with the React web app.
2. **"Driver, alphanumeric"** is read as a system-generated **Driver Code** (e.g. `DRV-2026-000123`), separate from the driver's name and NID. *(v1.2: drivers and rickshaws are registered independently; see §7.)*
3. **Rickshaw number**: unregistered vehicles have no official plate, so DARS **issues** a number (e.g. `DHK-AR-000123`) by default. Officers can also enter an existing local/union number, which must be unique and alphanumeric (`^[A-Z0-9-]{3,20}$`).
4. **"Authorized person"** means role-based access: **Admin** manages officers; **Officer** registers. Every record keeps `registeredBy` and `registeredAt`, and an audit log records all changes.
5. ~~**One active driver per rickshaw**; a driver can drive at most one rickshaw at a time. Reassignment is allowed and history is kept.~~ **Removed in v1.2**: in practice drivers move between rickshaws, so DARS no longer links a driver to a rickshaw.
6. **Missing items worth adding**: the owner of the rickshaw (often not the driver; ownership can change, see FR-13), duplicate detection by NID, a printable registration card/sticker with a QR code, and Bangla + English UI. The owner and QR card are in scope; Bangla i18n is set up but strings are English first.
7. **Privacy**: NID and photos are personal data. They're served only to authenticated users, uploads are size/type-checked, and nothing personal is public. The public complaint endpoints accept personal data but never return it.

---

## 1. Product Requirements

### 1.1 Users & roles
| Role | Can |
|---|---|
| ADMIN | Everything; create/disable officers; edit/suspend any record; view audit log |
| OFFICER | Register drivers, owners and rickshaws; edit own records within 24h; transfer rickshaw ownership; review complaints and file cases; search/view all |
| (Public) | Nothing else. All endpoints require login except `/auth/login`, a QR verify endpoint that returns only number, status and photo thumbnail, and (v1.2) the public complaint form and complaint status lookup. A member of the public who scans a vehicle QR code sees only that verify view (FR-17) |

### 1.2 Functional requirements
- **FR-1 Auth**: username/password login, JWT access token (15 min) + refresh token (7 days), logout, change password. Lockout after 5 failed attempts for 15 min.
- **FR-2 Officer management** (Admin): create, list, disable/enable, reset password. A seeded admin is created on first boot from env vars.
- **FR-3 Driver registration form** (identification properties):
  - Required: full name, father's/husband's name, date of birth (age ≥ 18), gender, **NID number** (10 or 17 digits, unique), mobile (`^01[3-9]\d{8}$`), present address, permanent address (division/district/thana/area + line), **driver photo** (JPEG/PNG, ≤ 2 MB)
  - Optional: driving licence number, blood group, emergency contact name/phone, NID front/back scans
  - System: `driverCode` (generated, alphanumeric, unique), status (ACTIVE/SUSPENDED/BLACKLISTED), registeredBy/At
- **FR-4 Owner**: name, NID, mobile, address. It can be the same person as the driver (checkbox that copies the driver's data).
- **FR-5 Rickshaw registration**: `rickshawNumber` (issued or entered, alphanumeric, unique), chassis/motor number (optional), color, manufacturer/model (optional), operating area/thana, **rickshaw photo** (required; optional second photo of the rear), owner (required at registration), status (ACTIVE/SUSPENDED/IMPOUNDED). *(v1.2: no driver is attached to a rickshaw.)* Editing a rickshaw does not change its owner; that goes through FR-13.
- **FR-6 Driver assignment**: **Removed in v1.2.** Drivers and rickshaws are independent records. Past assignment rows are kept in the database for reference only and are not shown or edited.
- **FR-7 Search & list**: paginated. Rickshaws filter by number, thana, status, registration date range and current owner NID/mobile. Drivers filter by driver code, NID, mobile, status and date range.
- **FR-8 Detail views**: rickshaw + current owner + photos + ownership history + complaints and cases against it; driver + complaints and cases against them.
- **FR-9 Registration card**: printable PDF/HTML card with photo, number, thana and the vehicle QR code (FR-17; no driver code from v1.2).
- **FR-10 Audit log**: who did what and when (create/update/status change/login; from v1.2 also ownership transfers, complaints and cases), viewable by Admin.
- **FR-11 Dashboard**: totals, registrations per day/thana, top officers; from v1.2 also open complaints and open cases.
- **FR-12 Mobile field capture**: register with the camera and look up by number or QR scan. Offline drafts are queued and synced when online (phase 3b).
- **FR-13 Ownership transfer** (v1.2): an OFFICER or ADMIN changes a rickshaw's owner to another registered owner (or a new owner created in the same flow), with an optional note. Each ownership period is kept with from/to dates and who made the change. Exactly one current owner per rickshaw. Transferring to the current owner is rejected (`SAME_OWNER`). Not subject to the 24h edit window.
- **FR-14 Complaints** (v1.2): a **member of the public files a complaint** against a rickshaw or a driver through a public web form (no login). Officers and admins review and act on it.
  - Required: **rickshaw number**, **driver code**, **complainant name**, **complainant phone** (`^01[3-9]\d{8}$`), **complainant NID** (10 or 17 digits), description (≤ 2000 chars).
  - Optional: incident date/time, location/thana, category (OVERCHARGING, MISBEHAVIOUR, RECKLESS_DRIVING, ACCIDENT, THEFT, OTHER; default OTHER).
  - The rickshaw number and driver code must belong to registered records (`RICKSHAW_NOT_FOUND` / `DRIVER_NOT_FOUND` otherwise).
  - System: `complaintNo` (`CMP-YYYY-NNNNNN`), status (OPEN → RESOLVED / REJECTED / ESCALATED), resolution note, filedAt, handledBy (the officer who last changed the status).
  - After submitting, the complainant sees the complaint number. They can check its status later with the complaint number + their phone; the lookup returns only number, status, filed date and the resolution note.
  - Abuse protection: the public endpoints are rate limited per client IP (default 5 complaints per hour, 30 lookups per hour; 429 `RATE_LIMITED`), and the form has a honeypot field. No CAPTCHA in v1.2.
  - Status changes need a note. ESCALATED is set only by filing a case from the complaint (FR-15).
  - Complainant NID/phone are personal data: shown only to authenticated users, never returned by public endpoints. Public error messages don't reveal driver/rickshaw details beyond "not registered".
- **FR-15 Cases** (v1.2, new feature): an OFFICER or ADMIN files a formal case against a rickshaw and/or a driver (at least one is required).
  - Required: offence (≤ 200 chars), description (≤ 2000 chars), incident date/time, thana.
  - Optional: rickshaw, driver, source complaint (the complaint becomes ESCALATED and links to the case), evidence photos (up to 3, same rules as other photos).
  - System: `caseNo` (`CASE-YYYY-NNNNNN`), status (OPEN → UNDER_INVESTIGATION → CLOSED / DISMISSED), resolution note, filedBy/At, closedAt.
  - Status changes need a note. Reopening a CLOSED/DISMISSED case is ADMIN-only. Filing a case does not change the rickshaw's or driver's status; that stays a separate admin action.
- **FR-16 Complaint & case lists**: paginated, filterable by status, rickshaw number, driver code, thana, date range; complaints also by complainant phone/NID.
- **FR-17 Vehicle QR code** (v1.2): every rickshaw has a QR code, generated on demand from its number (nothing is stored). It encodes the web app URL `<public base URL>/r/<rickshawNumber>`.
  - An officer or admin who scans it with any phone camera and is signed in is **redirected to the rickshaw's detail page**. Not signed in: the page shows the public verify view (number, status, registration date, vehicle photo) with "Officer sign in", which returns to the detail page after login, and "Report a problem", which opens the complaint form with the rickshaw number filled in.
  - Unknown number: "not registered, the card may be fake".
  - The QR code is printed on the registration card (FR-9) and shown on the rickshaw detail page with a PNG download (for stickers).
  - Cards printed before v1.2 encode the old `/api/v1/public/verify/<number>` URL and keep working as the plain public verify response; reprint them to get the redirect.

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
  - `assignment(id, rickshaw_id, driver_id, from_date, to_date null)` with partial unique indexes where `to_date is null` *(unused from v1.2; kept read-only for history)*
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
  - ~~`POST /rickshaws/{id}/assignments` (reassign), `GET /rickshaws/{id}/assignments`~~ removed in v1.2
  - v1.2: `POST /rickshaws/{id}/ownership` (transfer), `GET /rickshaws/{id}/ownership` (history)
  - v1.2: `POST /public/complaints` (no auth), `GET /public/complaints/{complaintNo}?phone=` (no auth, status only)
  - v1.2: `GET /complaints`, `GET /complaints/{id}`, `PATCH /complaints/{id}/status`
  - v1.2: `GET|POST /cases`, `GET /cases/{id}`, `PATCH /cases/{id}/status`
  - v1.2: `GET /rickshaws/{id}/complaints`, `GET /rickshaws/{id}/cases`, `GET /drivers/{id}/complaints`, `GET /drivers/{id}/cases`
  - `GET /rickshaws/{id}/card.pdf`, `GET /public/verify/{number}`
  - v1.2: `GET /rickshaws/{id}/qr.png` (auth; the vehicle QR code, FR-17)
  - `GET /audit` (ADMIN), `GET /dashboard/summary`
- **Errors**: a uniform `{code, message, fieldErrors[]}` body; 409 on duplicate NID/number.

### 2.2 Web (`web/`)
- Vite + React 18 + TS, React Router, TanStack Query, Axios (JWT interceptor with refresh), React Hook Form + Zod, MUI, react-i18next (en/bn), Recharts (dashboard).
- **Pages**: Login, Dashboard, Drivers (list/new/detail/edit), Owners, Rickshaws (list/new wizard: owner → vehicle+photo → review, detail with card print and "Change owner"), Complaints (list/detail), Cases (list/new/detail), Users (admin), Audit (admin). *(v1.2: the wizard's driver step and the detail page's reassign/assignment history are removed.)*
- **Public pages (v1.2, no login)**: `/complain` (complaint form → shows the complaint number; `?rickshaw=` pre-fills the number) and `/complain/status` (number + phone → status). Linked from the login page.
- **QR scan page (v1.2, FR-17)**: `/r/:number`. Signed in → redirect to `/rickshaws/:id`; otherwise the public verify view with sign-in (returns here) and "Report a problem".
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

**Phase 4: v1.2 change request** (§7): backend (V2 migration → remove assignment API → ownership transfer → complaints → cases → tests) → backend `CLAUDE.md` → web (wizard/detail cleanup → change owner → complaints → cases → dashboard counts) → web `CLAUDE.md`. Integration tests cover: rickshaw create without driver, transfer + history + `SAME_OWNER`, complaint with unknown rickshaw/driver → 404 codes, complaint missing complainant fields → 400, public complaint filed without a token + status lookup with wrong phone → 404, rate limit → 429, case with neither rickshaw nor driver → 400, escalating a complaint into a case, status transition rules.

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

---

## 7. v1.2 change request (from `docs/feedback_11_10_2026.md`, 2026-10-13)

| # | Feedback | Change |
|---|---|---|
| 1 | Owner can be changed | New FR-13 ownership transfer with history |
| 2 | Driver–rickshaw association isn't practical | FR-6 removed; FR-5/7/8/9 no longer mention a driver |
| 3 | A case can be filed against a rickshaw and a driver | New FR-15 cases |
| 4 | Complaints need rickshaw number, driver number, complainant name, phone, NID | New FR-14 complaints, FR-16 lists |
| 5 | A QR code per vehicle; an officer who scans it is redirected to the rickshaw details page | New FR-17 vehicle QR code; FR-9 card QR now encodes the web scan URL |

### 7.1 Data model (Flyway `V2__ownership_complaints_cases.sql`; `V1` is not edited)
- `ownership(id, rickshaw_id, owner_id, from_date, to_date null, changed_by, note)`. Backfilled with one open row per existing rickshaw from `rickshaw.owner_id`/`registered_at`/`registered_by`. `rickshaw.owner_id` stays as the current owner (denormalized for search and display); `RickshawService` keeps both in step. "One open row per rickshaw" is enforced in the service (no partial indexes, H2 portability).
- `complaint(id, complaint_no uq, rickshaw_id, driver_id, complainant_name, complainant_phone, complainant_nid, category, description, incident_at null, thana null, status, resolution_note, handled_by null, filed_at, updated_at)`
- `case_file(id, case_no uq, rickshaw_id null, driver_id null, complaint_id null, offence, description, incident_at, thana, status, resolution_note, filed_by, filed_at, updated_at, closed_at null)` (`case` is an SQL keyword, hence `case_file`). A complaint's case is found through `case_file.complaint_id`, plus `case_evidence(case_id, photo_id)`.
- Sequences `complaint_no_seq`, `case_no_seq`.
- `assignment` is left in place, untouched and no longer mapped by the API.

### 7.2 API changes
- `RickshawRequest.driverId` removed; `ownerId` is used on create only. `RickshawResponse.currentDriver` removed.
- `DriverResponse.currentRickshaw` removed.
- Rickshaw search `q` matches the number (contains) or the current owner's NID/mobile (exact).
- New endpoints as listed in §2.1. New error codes: `SAME_OWNER`, `RICKSHAW_NOT_FOUND`, `DRIVER_NOT_FOUND`, `CASE_TARGET_REQUIRED`, `COMPLAINT_NOT_OPEN`, `INVALID_STATUS_TRANSITION`.
- `GET /public/verify/{number}` is unchanged and never exposes complaints or cases.
- FR-17: new `GET /rickshaws/{id}/qr.png`. The card's QR code now encodes `dars.public-base-url + /r/{number}`, so `dars.public-base-url` (`DARS_PUBLIC_BASE_URL`) is now the **web app's** public URL (dev default `http://localhost:5173`, was the backend's `:8080`). No schema change.

### 7.3 Scope of this change
- Order: PRD → approval → backend → backend `CLAUDE.md` → web → web `CLAUDE.md`.
- **Mobile is not in this round.** Its "Register Rickshaw" flow still sends `driverId` and shows the current driver, so it needs a follow-up update to keep working against the v1.2 backend. Its QR scanner (`mobile/src/lib/qr.ts`) only extracts the number from `/public/verify/<number>` URLs, so it must also accept the new `/r/<number>` URL.
- Complaints are filed by the public through the unauthenticated complaint form (FR-14). The rest of the citizen portal stays out of scope.
