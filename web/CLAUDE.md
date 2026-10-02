# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Office web app for DARS (Dhaka Auto-Rickshaw Registration System). Officers and admins use it to register and
search rickshaws, drivers and owners, print registration cards, manage officer accounts and read the audit log.
It is a client of the Spring Boot API in `../backend` (see `../backend/CLAUDE.md` for the server-side rules).
Requirements are in `../docs/PRD.md`.

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
- Everything except `/login` sits inside `RequireAuth` + `Layout` (the app shell with nav and the outlet).
- `RequireAdmin` guards `/users` and `/audit`.
- Create and edit share a page (`drivers/new` and `drivers/:id/edit` → `DriverFormPage`; `rickshaws/new` and
  `rickshaws/:id/edit` → `RickshawWizardPage`), switching on whether `:id` is present.

**API layer (`src/api/`).**
- `client.ts`: the shared axios instance with `baseURL` = `VITE_API_URL ?? '/api/v1'`.
  - The access token lives only in memory. The refresh token lives in `localStorage` (`dars.refreshToken`).
  - A response interceptor catches a 401, makes one *single-flight* refresh shared by all concurrent requests,
    then retries once. If the refresh fails it calls the session-expired handler that `AuthProvider` registered,
    which logs the user out. `/auth/*` calls are never retried.
  - `apiError(err)` normalizes any failure into the backend's `ApiError { code, message, fieldErrors[] }`
    (with a `NETWORK` code when the server can't be reached).
- `endpoints.ts`: one object per resource (`authApi`, `driverApi`, `rickshawApi`, `ownerApi`, `photoApi`,
  `userApi`, `auditApi`, `dashboardApi`), each returning `r.data`. Query params pass through `clean()`, which
  drops empty values. Add new endpoints here rather than calling `api` from components.
- `types.ts`: hand-written TypeScript types for the backend's response DTOs. There is no codegen, so update them
  when the backend's `dto/` records change.

**Auth (`src/auth/AuthContext.tsx`).** On startup it tries the stored refresh token and then calls `/auth/me`.
`restoring` stays true until that finishes, and `RequireAuth` shows a spinner in the meantime. `useAuth()` exposes
`user`, `login` and `logout`.

**Server state.** All data comes through TanStack Query; there is no other global store. The defaults in
`main.tsx` are `retry: 1`, no refetch on window focus, and a 30s `staleTime`. Query key conventions:
- `['rickshaws', …]`, `['drivers', …]`, `['owners', …]`, `['users']`, `['audit', …]` and `['dashboard']` for lists and summaries.
- `['rickshaw', id]`, `['driver', id]` and `['photo', id]` for single records.
- List pages keep their filters and page in the URL (`useSearchParams`) and use `params.toString()` in the key.
- After a mutation, invalidate *every* affected list, not just the edited record. For example, saving a rickshaw
  invalidates `rickshaws`, `drivers` (current assignment) and `dashboard`.

**Forms.**
- Every form is React Hook Form with `zodResolver` and a schema from `src/schemas.ts`. Each schema exports both
  `XxxForm = z.input<…>` (the field values) and `XxxInput = z.output<…>` (the API payload). The schemas trim
  input and turn blank optional fields into `null` to match the backend.
- `PATTERNS` in `schemas.ts` mirrors the backend's `bd.dhaka.dars.validation.Patterns`; keep the two in sync.
  `isAdult` mirrors the backend's `@Adult` check.
- On a failed submit, call `applyServerErrors(form, apiError(e))` (`components/forms.tsx`). It copies the backend's
  per-field errors onto the form and returns the message for `<FormAlert>`.
- `components/forms.tsx` also has `AddressFields` (a nested present, permanent or owner address), `errorAt`, and the
  `DIVISIONS` / `DHAKA_THANAS` suggestion lists (free text is still allowed).

**Photos.**
- The backend serves photos only to logged-in users, so never use `<img src="/api/...">`. Render them with
  `<AuthImage id=…>`, which fetches a blob through `photoApi` and manages the object URL.
- Uploads go through `<PhotoInput>`: webcam or file → `lib/resizeImage` (longest edge ≤ 1600 px, re-encoded as JPEG
  at quality 0.82) → `photoApi.upload` → the returned UUID becomes the form value (`photoId`, `nidFrontId`, …).
  Records refer to photos by these IDs.

**Permissions.** `lib/permissions.canEdit(user, registeredById, registeredAt)` copies the backend's rule (an admin
can edit anything; an officer can edit their own records for 24h) and decides when edit buttons appear. The
backend still enforces the rule, so this check only shapes the UI. Status changes (`StatusMenu`) are admin-only.

**Rickshaw registration** is a four-step wizard (`Driver → Owner → Vehicle → Review`) in `RickshawWizardPage`.
Driver and owner are picked with `DriverPicker` / `OwnerPicker` (search-as-you-type `Autocomplete`), or a new owner
is created inline through `OwnerDialog`. A rickshaw must have a driver. `?driverId=` preselects one. Edit mode
opens directly on the Vehicle step. If the server rejects the save, the wizard jumps back to the step with the errors.

**i18n.** `i18n.ts` holds inline `en` and `bn` resources (the language choice is stored in `localStorage` under
`dars.lang`). Only the app name, the nav and a few actions are translated; page content is still hard-coded
English. Add new keys to both languages.

**Look and feel.** `theme.ts` exports `colors` (plate green, signal red, slate ink, paper) and `fonts` (Barlow
Condensed for display, IBM Plex Sans/Mono, Noto Sans Bengali for Bangla), bundled through `@fontsource` in `main.tsx`.
Use these tokens and MUI `sx` rather than new hex values. Reuse the shared UI pieces in `components/common.tsx`
(`PageHeader`, `Section`, `Field`, `StatusChip`, `Mono`, `EmptyState`) and `Plate` (the rickshaw number shown as a
number plate).

## Tests

Vitest with jsdom. `src/test/setup.ts` loads the jest-dom matchers, and CSS is disabled. Tests sit next to the code
they cover (`*.test.ts`). The current tests are pure logic tests (Zod schemas, `isAdult`, `canEdit`,
`fitWithin`); there are no component or API tests. Pass a fixed `today` / `now` to anything that depends on the date.

## Lint notes

oxlint runs the react, typescript and oxc plugins, with `react/rules-of-hooks` as an error and
`react/only-export-components` as a warning. Some files contain `// eslint-disable-next-line` comments left over
from an earlier ESLint setup; oxlint still honours that syntax.
