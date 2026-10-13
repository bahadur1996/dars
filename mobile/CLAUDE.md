# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Field app for DARS (Dhaka Auto-Rickshaw Registration System). Officers use it on their phones to register drivers
and rickshaws with the camera, look up rickshaws and drivers by search or by scanning the registration card's QR
code, change a rickshaw's owner, and file cases against a rickshaw and/or a driver. It is a client of the Spring
Boot API in `../backend` (see `../backend/CLAUDE.md`); the office web app in `../web` covers everything else
(complaint handling, case status changes, officer accounts, audit, dashboard). Requirements are in `../docs/PRD.md`
(mobile in §2.3, v1.2 changes in §7).

Stack: Expo SDK 57, React Native 0.86, React 19, TypeScript ~6, Expo Router (typed routes), TanStack Query 5,
React Hook Form + Zod 4, expo-camera (QR scanning), expo-image-picker + expo-image-manipulator (photos),
expo-secure-store (refresh token). Tests: Jest (`jest-expo`). Lint: ESLint with `eslint-config-expo`.

`AGENTS.md` has the general Expo rules (read the versioned docs before touching Expo APIs, use
`npx expo install`, never hand-edit `ios/`/`android/`). Follow it.

## Commands

```bash
npm install
npx expo start               # a = Android, i = iOS, w = web (http://localhost:8081)
npm test                     # jest (all tests once)
npx jest -t "case schema"    # tests matching a name
npx tsc --noEmit             # type check
npx expo lint                # lint
```

Before finishing a change, run `npm test && npx tsc --noEmit && npx expo lint`.

The API base is `EXPO_PUBLIC_API_URL` ?? `expo.extra.apiUrl` ?? `http://localhost:8080/api/v1`. On a phone use the
computer's LAN IP (`http://192.168.x.x:8080/api/v1`); on the Android emulator use `http://10.0.2.2:8080/api/v1`.
The web target needs its origin in the backend's `DARS_CORS_ORIGINS` (8081 is allowed by default).
Dev login: `admin / Admin@12345`.

**Typed routes.** Expo Router generates route types into `.expo/types/` when the dev server runs. After adding or
renaming a screen, `tsc` reports "not assignable to type ... RelativePathString" until you run `npx expo start`
once.

## Architecture

**Routing (`src/app/`).** Every file is a screen; keep non-route code in `src/components/` or `src/lib/`.
`_layout.tsx` loads fonts, sets up `QueryClientProvider` (`retry: 1`, 30s `staleTime`) and `AuthProvider`, and
uses `Stack.Protected` guards: `login` only without a user, everything else only with one. New screens need a
`Stack.Screen` entry there for their title.
- `index`: home quick actions + latest registrations.
- `rickshaws/new`: camera-first registration (photos → owner → details). `rickshaws/[id]`: detail with owner,
  "Change owner" (ownership transfer), complaints, cases, ownership history, "File a case".
- `drivers/new`, `drivers/[id]` (identification, complaints, cases, "File a case").
- `cases/new` (`?rickshawId=` / `?driverId=` preselect a target), `cases/[id]` (read-only).
- `search` (rickshaws or drivers), `scan` (QR code → rickshaw detail).

**API (`src/lib/api.ts`).** A small `fetch` wrapper, `request<T>(path, { method, body, form, query, raw })`.
- The access token is in memory; the refresh token is in SecureStore (`lib/storage.ts`, localStorage on the web
  build). A 401 triggers one single-flight refresh and a retry; if that fails, the session-expired handler signs
  the user out. `/auth/*` is never retried.
- Failures throw `ApiError(message, code, status, fieldErrors)`; network failures use code `NETWORK`.
- One object per resource (`authApi`, `driverApi`, `ownerApi`, `rickshawApi`, `caseApi`, `photoApi`). Add new
  endpoints there, not in screens.

**Shared with the web app.** `lib/types.ts` and `lib/schemas.ts` are copies of `web/src/api/types.ts` and
`web/src/schemas.ts` (which mirror the backend DTOs and `bd.dhaka.dars.validation.Patterns`). Don't edit them
here alone: change the web copy and the backend together, then copy the file over (keep the header comment on
`schemas.ts`). Mobile-only helpers go elsewhere (`lib/datetime.ts`, `lib/useDebounced.ts`, `lib/qr.ts`).

**Domain rules to keep (PRD v1.2).**
- Drivers are **not linked** to rickshaws: no "current driver", "drives" or assignment history anywhere, and
  `RickshawRequest` has no `driverId`.
- A rickshaw's owner is set at registration; later changes go through `rickshawApi.transferOwnership` (any officer,
  rejected with `SAME_OWNER` for the current owner). The history comes from `rickshawApi.ownership`.
- Cases need a rickshaw, a driver or both (`caseSchema` refine, backend `CASE_TARGET_REQUIRED`); up to 3 evidence
  photos; `incidentAt` is Dhaka wall time `YYYY-MM-DDTHH:mm` turned into an ISO instant by `localToIso`, and may
  not be in the future. Filing doesn't change the rickshaw's or driver's status. Escalating a complaint into a
  case (`complaintId`) and all status changes stay in the web app.
- Complaints are shown read-only (`components/Records.tsx`); the public files them on the web.

**QR codes (`lib/qr.ts`).** Cards encode `<web base>/r/<NUMBER>` (FR-17); cards printed before v1.2 encode
`<base>/api/v1/public/verify/<NUMBER>`. `rickshawNumberFromQr` accepts both, plus a bare number, and returns null
for anything else. `scan.tsx` then calls `rickshawApi.byNumber` and opens the detail screen.

**Server state.** TanStack Query only. Keys follow the web app: `['rickshaws', …]` / `['drivers', …]` for lists,
`['rickshaw', id]`, `['driver', id]`, `['case', id]` for records, with sub-resources under the record key
(`['rickshaw', id, 'ownership' | 'complaints' | 'cases']`, `['driver', id, 'complaints' | 'cases']`), so
invalidating the record key refreshes them. After a mutation invalidate every affected key (filing a case
invalidates `['rickshaw']` and `['driver']`).

**Forms.** React Hook Form + `zodResolver` with a schema from `lib/schemas.ts` (`XxxForm` = field values,
`XxxInput` = API payload). Bind text inputs with `CField` (`components/FormFields.tsx`) and map backend field errors
with `applyServerErrors(form.setError, e.fieldErrors)`. Show a summary with `<Banner>`.
State that a screen can derive (e.g. a preselected target from a query) is derived during render; the lint rule
`react-hooks/set-state-in-effect` rejects `setState` inside `useEffect`.

**Pickers.** `components/OwnerPicker.tsx` (search or create an owner; used by registration and ownership transfer)
and `components/Pickers.tsx` (`RickshawPicker`, `DriverPicker`; search-as-you-type after 3 characters, debounced).
`DriverPicker` deliberately lists suspended/blacklisted drivers too.

**Photos.** `PhotoField` takes a photo with the camera (or picks one), `lib/photo.ts` downsizes it (long edge ≤ 1600
px, JPEG 0.8) and uploads it; the form keeps the returned photo id. Photos need the bearer token, so always render
them with `AuthImage` (native `Image` sends the header; the web build fetches a blob).

**UI.** Reuse `components/ui.tsx` (`Screen`, `Title`, `Card`, `SectionLabel`, `Field`, `Chips`, `Button`, `Banner`,
`Plate`, `StatusBadge`, `Row`, `Muted`, `Mono`) and the tokens in `components/theme.ts` (`colors`, `fonts`) instead
of new styles or hex values. `StatusBadge` shows ACTIVE/RESOLVED/CLOSED calmly and everything else in signal red.

## Tests

`src/lib/__tests__/lib.test.ts` covers pure logic: QR parsing (new and old card URLs), photo resize maths, the
shared schemas (driver, rickshaw without `driverId`, case target/time/evidence rules) and `dhakaNowLocal`. There
are no component or API tests. Pass a fixed `Date` to anything time-dependent.

## Not built yet

Offline drafts and sync (PRD phase 3b): the app needs a connection to register or file a case.
