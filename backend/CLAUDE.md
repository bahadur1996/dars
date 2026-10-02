# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DARS (Dhaka Auto-Rickshaw Registration System) backend: a REST API that officers use to register auto-rickshaws,
their owners and drivers. The web app (`../web`) and mobile app (`../mobile`) both call it. Requirements live in
`../docs/PRD.md`, and code comments cite them by number (e.g. `FR-6`, `FR-9`).

Stack: Spring Boot 4.1, Java 21, Maven, Spring Security OAuth2 resource server (HS256 JWT), Spring Data JPA,
Flyway, H2 (dev/test) / PostgreSQL 16 (prod), Lombok (entities only), springdoc, ZXing (QR), OpenPDF.

## Commands

Run from `backend/` (on Windows use `mvnw.cmd`, or plain `mvn` if it's on the PATH):

```bash
./mvnw spring-boot:run                                  # dev server on :8080, H2 file DB in ./data, photos in ./uploads
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod  # PostgreSQL; needs DARS_DB_*, DARS_JWT_SECRET, DARS_ADMIN_PASSWORD
./mvnw test                                             # all tests (in-memory H2, "test" profile)
./mvnw test -Dtest=ValidationTest                       # one class
./mvnw test -Dtest=ApiFlowIntegrationTest#methodName    # one method
./mvnw package                                          # executable jar in target/
```

- `docker compose up -d` (repo root) starts a PostgreSQL 16 that matches the prod profile defaults.
- Swagger UI: http://localhost:8080/swagger-ui. Health: `/actuator/health`.
- The first boot seeds the admin account `admin / Admin@12345` (`DataSeeder`, only when `app_user` is empty).
- No linter or formatter is configured.
- Reset dev data by deleting `data/` and `uploads/` while the server is stopped.

## Package layout (layered, under `bd.dhaka.dars`)

`controller` → `service` → `repository`, with `entity`, `dto`, `exception`, `security`, `validation` and `config`
alongside. Keep new classes in these layer packages; don't reintroduce per-feature packages.

- `dto/` groups each domain's records in one holder class (`DriverDtos`, `RickshawDtos`, …) holding nested
  `XxxRequest` / `XxxResponse` / `XxxSummary` / `XxxRef` records. Responses have a static `from(entity, …)`
  factory. Request records normalize input in their compact constructor (trim, upper-case numbers,
  blank → null), so services can assume clean values.
- `entity/` holds the JPA entities (Lombok `@Getter/@Setter`, protected no-arg constructor), their status/enum
  types, and the `@Embeddable Address` record.
- `validation/Patterns` holds the shared regex constants (NID 10 or 17 digits, Bangladeshi mobile, rickshaw
  number). `@Adult` checks a date of birth is at least 18 years ago.

## Architecture and cross-cutting rules

**Schema is Flyway-owned.** `ddl-auto: validate`, so every entity change needs a new
`src/main/resources/db/migration/V{n}__*.sql`. Never edit `V1__init.sql`. The SQL must run on both
PostgreSQL and H2 in PostgreSQL mode, so avoid partial indexes and other Postgres-only features. Driver codes
(`DRV-<year>-NNNNNN`) and auto-issued rickshaw numbers (`DHK-AR-NNNNNN`) come from DB sequences, read through
native `nextval` queries in the repositories.

**Transactions and lazy loading.** `open-in-view` is off. Controllers are `@Transactional` / `@Transactional(readOnly = true)`
and map entities to DTOs inside that transaction, because response mapping touches lazy associations
(owner, photos, current driver). Keep this pattern for new endpoints. Services call each other and get
validated references through `get(id)` / `PhotoService.require(id, field)` rather than repositories directly.

**Errors.** Throw `ApiException` (factories `notFound`, `conflict`, `badRequest`, `forbidden`) with a stable
UPPER_SNAKE `code`. `GlobalExceptionHandler` turns everything into the `ApiError { code, message, fieldErrors }`
JSON shape that the web and mobile apps parse. Bean validation errors become `VALIDATION_FAILED` with
per-field messages. A `DataIntegrityViolationException` becomes 409 `DUPLICATE`, but services check
uniqueness first so they can return specific codes (`DUPLICATE_NID`, `DUPLICATE_NUMBER`).

**Auth and authorization.**
- Stateless JWT: `AuthService` issues access tokens (15m) with a `roles` claim, which `SecurityConfig` maps to `ROLE_*`.
- Refresh tokens (7d) are stored as SHA-256 hashes and rotated (single use). Logout revokes the given refresh token. A password change revokes all of that user's tokens.
- Five failed logins lock the account for 15 minutes. That login method uses `noRollbackFor` so the counter persists while it throws 401.
- Without a token, only `/api/v1/auth/login|refresh`, `/api/v1/public/**`, swagger and health are reachable.
- `/api/v1/users/**` and `/api/v1/audit/**` are ADMIN-only at the filter level.
- Finer rules live in services through `security/CurrentUser`:
  - `checkAdmin()` guards status changes.
  - `checkCanEdit(registeredBy, registeredAt)` lets an ADMIN edit anything, and an OFFICER edit only records they registered, within 24 hours.
- Two roles: `ADMIN`, `OFFICER`.

**Audit log.** Every create, update, status change, assignment and login event calls `AuditService`:
- `log(...)` needs an existing transaction (`Propagation.MANDATORY`) and takes the actor from the security context.
- `logAs(actor, ...)` is for flows without a security context, such as login.

New mutating service methods should audit the same way (`action`, `entity`, `id`, short `details`).

**Domain rules worth knowing before editing:**
- A rickshaw must be created with a driver. `AssignmentService.assign` enforces one open assignment
  (`to_date is null`) per rickshaw and per driver, and only for `ACTIVE` drivers. The DB doesn't enforce this
  (partial unique indexes aren't portable to H2), so always go through `AssignmentService`.
- Driver NID is unique. Rickshaw numbers are upper-case alphanumeric/dash and unique. A blank number means "auto-issue".
- Search uses JPA `Specification`s. Rickshaw search `q` matches the number (contains) or the *current* driver's
  code/NID/mobile (exact, by subquery). Date filters are inclusive days in `Asia/Dhaka` (`RickshawService.DHAKA`).
- Photos are uploaded first through `PhotoController` (JPEG/PNG detected from magic bytes, max 2 MB), then
  referenced by UUID in driver/rickshaw requests. Bytes go through the `StorageService` interface
  (`LocalStorageService` writes to `dars.storage-dir` under `yyyy/MM/` keys).
- `PublicVerifyController` is unauthenticated on purpose (QR code target). It may expose only the rickshaw
  number, status, registration date and vehicle photo, never driver or owner personal data.
- `CardService` renders the printable PDF registration card. Its QR code encodes
  `dars.public-base-url + /api/v1/public/verify/{number}`.

## Configuration

All app settings bind to `config/DarsProperties` (`dars.*` in `application.yml`). Each one can be overridden
by an env var: `DARS_JWT_SECRET` (at least 32 bytes, checked at startup), `DARS_STORAGE_DIR`, `DARS_CORS_ORIGINS`
(comma-separated; dev default allows the Vite and Expo ports), `DARS_PUBLIC_BASE_URL`, `DARS_ADMIN_USERNAME`
and `DARS_ADMIN_PASSWORD`. `application-prod.yml` switches the datasource to `DARS_DB_URL`, `DARS_DB_USERNAME`
and `DARS_DB_PASSWORD`, and has no defaults for the secrets.

## Tests

- `ValidationTest` is a plain Bean Validation unit test of the request DTOs (no Spring context).
- `ApiFlowIntegrationTest` is `@SpringBootTest` + MockMvc on the `test` profile (in-memory H2, uploads in
  the temp dir). It logs in as the seeded admin in `@BeforeEach`, creates officers through the API, and
  generates PNG uploads in memory.
- The Spring context and database are shared across tests and never reset. Use unique values (see
  `uniqueNid()`) instead of assuming an empty DB.
