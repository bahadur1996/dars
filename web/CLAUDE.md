# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Office web app for DARS (Dhaka Auto-Rickshaw Registration System). Officers and admins use it to register and
search rickshaws, drivers and owners, print registration cards, transfer rickshaw ownership, handle complaints and
cases, manage officer accounts and read the audit log. It also serves public pages (no login) where members of
the public file a complaint and check its status, and the landing page that vehicle QR codes open.
It is a client of the Spring Boot API in `../backend` (see `../backend/CLAUDE.md` for the server-side rules).
Requirements are in `../docs/PRD.md` (v1.2 changes in its section 7).

Stack: React 19, TypeScript ~6, Vite 8, MUI 9 (Emotion), TanStack Query 5, React Router 7, React Hook Form + Zod 4,
axios, i18next, Recharts. Tests: Vitest 5 + Testing Library on jsdom. Lint: oxlint.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api -> http://localhost:8080 (start the backend first)
npm test             # vitest run (all tests once)
npx vitest           # watch mode
npx vitest run src/schemas.test.ts        # one file
npx vitest run -t "accepts a 17-digit NID" # tests matching a name
npm run lint         # oxlint
npm run build        # tsc -b (type check) + vite build -> dist/
npm run preview      # serve dist/
```

Before finishing a change, run `npm test && npm run build` (the README's check). The build is the only full type
check. `tsconfig` turns on `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax` (use `import type` for
types) and `erasableSyntaxOnly` (no `enum`s, namespaces or parameter properties).

Dev login: `admin / Admin@12345` (the backend seeds it on first boot).

## Architecture

**Entry and routing.** `main.tsx` nests the providers: MUI `ThemeProvider` → `QueryClientProvider` → `BrowserRouter` →
`AuthProvider` → `App`. All routes live in `App.tsx`:
- `/login`, `/complain`, `/complain/status` and `/r/:number` are public. They use `PublicShell` (exported from
  `PublicComplaintPages.tsx`) rather than `Layout`, and must work without a session. `/complain?rickshaw=` pre-fills
  the rickshaw number.
- `/r/:number` (`RickshawScanPage`) is what the vehicle QR code encodes (FR-17). It waits for `restoring`, then a
  signed-in user is redirected (`replace`) to `/rickshaws/:id` via `rickshawApi.byNumber`. Anyone else gets the
  public verify view, whose "Officer sign in" passes `state.from` so `LoginPage` returns to `/r/:number` (and so
  on to the detail page). Don't change the path: it is printed on cards.
- Everything else sits inside `RequireAuth` + `Layout` (the app shell with nav and the outlet).
- `RequireAdmin` guards `/users` and `/audit`.
- Create and edit share a page (`drivers/new` and `drivers/:id/edit` → `DriverFormPage`; `rickshaws/new` and
  `rickshaws/:id/edit` → `RickshawWizardPage`), switching on whether `:id` is present. Cases have only
  `cases/new` (`CaseFormPage`). It reads `?rickshawId=`, `?driverId=` or `?complaintId=` to preselect what the case
  is against. Complaints are never created in the office app.

**API layer (`src/api/`).**
- `client.ts`: the shared axios instance with `baseURL` = `VITE_API_URL ?? '/api/v1'`.
  - The access token lives only in memory. The refresh token lives in `localStorage` (`dars.refreshToken`).
  - A response interceptor catches a 401, makes one *single-flight* refresh shared by all concurrent requests,
    then retries once. If the refresh fails it calls the session-expired handler that `AuthProvider` registered,
    which logs the user out. `/auth/*` calls are never retried.
  - `apiError(err)` normalizes any failure into the backend's `ApiError { code, message, fieldErrors[] }`
    (with a `NETWORK` code when the server can't be reached).
- `endpoints.ts`: one object per resource (`authApi`, `driverApi`, `rickshawApi`, `ownerApi`, `photoApi`,
  `complaintApi`, `caseApi`, `userApi`, `auditApi`, `dashboardApi`, and `publicApi` for the unauthenticated
  complaint and verify endpoints), each returning `r.data`. Query params pass through `clean()`, which
  drops empty values. Add new endpoints here rather than calling `api` from components.
- `types.ts`: hand-written TypeScript types for the backend's response DTOs. There is no codegen, so update them
  when the backend's `dto/` records change.

**Auth (`src/auth/AuthContext.tsx`).** On startup it tries the stored refresh token and then calls `/auth/me`.
`restoring` stays true until that finishes, and `RequireAuth` shows a spinner in the meantime. `useAuth()` exposes
`user`, `login` and `logout`.

**Server state.** All data comes through TanStack Query; there is no other global store. The defaults in
`main.tsx` are `retry: 1`, no refetch on window focus, and a 30s `staleTime`. Query key conventions:
- `['rickshaws', …]`, `['drivers', …]`, `['owners', …]`, `['complaints', …]`, `['cases', …]`, `['users']`, `['audit', …]`
  and `['dashboard']` for lists and summaries.
- `['rickshaw', id]`, `['driver', id]`, `['complaint', id]`, `['case', id]` and `['photo', id]` for single records.
  Sub-resources hang off the record key (`['rickshaw', id, 'ownership' | 'complaints' | 'cases']`,
  `['driver', id, 'complaints' | 'cases']`), so invalidating `['rickshaw', id]` refreshes them too.
- List pages keep their filters and page in the URL (`useSearchParams`) and use `params.toString()` in the key.
- After a mutation, invalidate *every* affected list, not just the edited record. For example, filing a case
  invalidates `cases`, `complaints`, `complaint` (it may escalate one), `rickshaw`, `driver` and `dashboard`.

**Forms.**
- Every form is React Hook Form with `zodResolver` and a schema from `src/schemas.ts`. Each schema exports both
  `XxxForm = z.input<…>` (the field values) and `XxxInput = z.output<…>` (the API payload). The schemas trim
  input and turn blank optional fields into `null` to match the backend.
- `PATTERNS` in `schemas.ts` mirrors the backend's `bd.dhaka.dars.validation.Patterns`; keep the two in sync.
  `isAdult` mirrors the backend's `@Adult` check.
- `datetime-local` inputs hold Dhaka wall time. `localToIso` (in `schemas.ts`) turns them into ISO instants for the
  API, and the complaint/case schemas reject future times.
- The public complaint form maps `RICKSHAW_NOT_FOUND` / `DRIVER_NOT_FOUND` onto the matching field and shows
  `RATE_LIMITED` as a message. Its hidden `website` input is a honeypot: keep it out of sight and out of the tab
  order, and send it as-is (the backend rejects a filled one).
- On a failed submit, call `applyServerErrors(form, apiError(e))` (`components/forms.tsx`). It copies the backend's
  per-field errors onto the form and returns the message for `<FormAlert>`.
- `components/forms.tsx` also has `AddressFields` (a nested present, permanent or owner address), `errorAt`, and the
  `DIVISIONS` / `DHAKA_THANAS` suggestion lists (free text is still allowed).

**Photos.**
- The backend serves photos only to logged-in users, so never use `<img src="/api/...">`. Render them with
  `<AuthImage id=…>`, which fetches a blob through `photoApi` and manages the object URL. The one exception is
  `publicApi.verifyPhotoUrl` (the unauthenticated verify photo on the scan page).
- The rickshaw QR image (`rickshawApi.qrPng`, query key `['rickshaw', id, 'qr']`) is fetched as a blob the same way
  and shown with a download link in the `QrSection` of `RickshawDetailPage`.
- Uploads go through `<PhotoInput>`: webcam or file → `lib/resizeImage` (longest edge ≤ 1600 px, re-encoded as JPEG
  at quality 0.82) → `photoApi.upload` → the returned UUID becomes the form value (`photoId`, `nidFrontId`, …).
  Records refer to photos by these IDs.

**Permissions.** `lib/permissions.canEdit(user, registeredById, registeredAt)` copies the backend's rule (an admin
can edit anything; an officer can edit their own records for 24h) and decides when edit buttons appear. The
backend still enforces the rule, so this check only shapes the UI. Rickshaw and driver status changes
(`StatusMenu`) are admin-only. Complaint and case status changes use `StatusMenu` with `requireNote`, and only
offer the moves the backend allows:
- Complaints: OPEN → RESOLVED / REJECTED. ESCALATED happens only by filing a case from the complaint.
- Cases: see `nextStatuses` in `CaseDetailPage`. Reopening a closed case is admin-only.

Any officer may change a rickshaw's owner. The 24h edit window doesn't apply.

**Rickshaw registration** is a three-step wizard (`Owner → Vehicle → Review`) in `RickshawWizardPage`. The owner
is picked with `OwnerPicker` (search-as-you-type `Autocomplete`) or created inline through `OwnerDialog`. **Drivers
are not linked to rickshaws** (PRD v1.2), so don't show a "current driver" or "drives" anywhere. Edit mode opens
directly on the Vehicle step and never changes the owner. If the server rejects the save, the wizard jumps back to
the step with the errors.

**Ownership.** "Change owner" on `RickshawDetailPage` (`TransferDialog`) posts an ownership transfer and keeps the
history shown on that page. "Edit details" edits the current owner's own record (`OwnerDialog`); it doesn't
transfer.

**Complaints and cases.** `components/Records.tsx` has the compact `ComplaintRows` / `CaseRows` tables used on the
rickshaw and driver pages, plus `CATEGORY_LABEL`. `Pickers.tsx` has `DriverPicker`, `OwnerPicker` and
`RickshawPicker`. Pass `allowInactive` to `DriverPicker` when suspended drivers must be selectable, as on the case
form.

**i18n.** `i18n.ts` holds inline `en` and `bn` resources (the language choice is stored in `localStorage` under
`dars.lang`). Only the app name, the nav and a few actions are translated; page content is still hard-coded
English. Add new keys to both languages.

**Look and feel.** `theme.ts` exports `colors` (plate green, signal red, slate ink, paper) and `fonts` (Barlow
Condensed for display, IBM Plex Sans/Mono, Noto Sans Bengali for Bangla), bundled through `@fontsource` in `main.tsx`.
Use these tokens and MUI `sx` rather than new hex values. Reuse the shared UI pieces in `components/common.tsx`
(`PageHeader`, `Section`, `Field`, `StatusChip`, `enumLabel`, `Mono`, `EmptyState`) and `Plate` (the rickshaw number shown as a
number plate).

## Tests

Vitest with jsdom. `src/test/setup.ts` loads the jest-dom matchers, and CSS is disabled. Tests sit next to the code
they cover (`*.test.ts`). The current tests are pure logic tests (Zod schemas including the complaint and case
forms, `isAdult`, `localToIso`, `canEdit`, `fitWithin`); there are no component or API tests. Pass a fixed `today` / `now` to anything that depends on the date.

## Lint notes

oxlint runs the react, typescript and oxc plugins, with `react/rules-of-hooks` as an error and
`react/only-export-components` as a warning. Some files contain `// eslint-disable-next-line` comments left over
from an earlier ESLint setup; oxlint still honours that syntax.
