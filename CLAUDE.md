# CLAUDE.md — Negah Admin Console (data-processor-panel)

Engineering rules for this repo. They override default behavior. Read them before writing any code.

## Output brevity and token efficiency

* Minimize output tokens: be thorough in reasoning, concise in the final response. No filler openers or unnecessary closing summaries.
* Skip reading files larger than 100KB unless the task genuinely requires their content.
* Do not guess APIs, versions, flags, commit SHAs, package names, or implementation details — verify by reading the code or official docs before asserting them.

## 00. Non-negotiable rules

### 00.1 — Look and feel: the UI/UX team designed the whole system

Every screen in this product was designed by the UI/UX team. Anything new (a field, a card, a modal, a table column, a page) was **not** designed, so it must look exactly as if the same designer had drawn it.

- **Reuse existing components first.** Before writing markup, search for a component that already does the job: `src/shared/ui/*` (`SectionCard`, `DashedCard`/`FieldCard`, `DashedBorder`, `AlignedFormField`, `FormActionBar`, `RecordListPanel`, `rhf-pro/*`), `src/components/*` (`basic-table`, `basic-form`, `basic-button`, `basic-content`, …) and the nearest feature's UI. The selection table in `docs/ui-component-guide.en.md` is the authority — read it before building a form/report/list page.
- **Copy the closest existing screen's structure** (same card hierarchy, same spacing, same action placement, same empty/loading/error states, same Persian copy tone). Do not invent a new visual pattern.
- **Colors come from the existing palette only**: Ant Design tokens / the CSS variables in `src/styles/theme/` (surfaced as Tailwind colors via `tailwind.config.ts`). Never hard-code a hex/`rgba()`, never use a color that is not already used in the system. Need a shade? Use the token or add it to the theme, not to a component.
- Use AntD components and tokens (`theme.useToken()`) before custom CSS. Use Tailwind utilities for layout; reuse existing CSS classes (`form-layout`, `aligned-form-grid--*`, …).
- RTL/Persian is the primary mode (`direction` is set in `src/app.tsx`). Use logical properties (`ms-`/`me-`/`ps-`/`pe-`, `text-start`) and Jalali dates through `src/shared/lib/dayjs-jalali.ts` / `antd-jalali`, never raw Gregorian display.
- All user-facing text goes through i18n (`src/locales/{fa-IR,en-US,...}`) — no hard-coded strings in components; add keys to every shipped locale file that the feature already uses.

### 00.2 — No duplication, follow the existing structure

- **Never duplicate code.** If the same logic, query, mapper, constant, class string or JSX appears a second time, extract it to the right shared place and use it in both. Reuse beats rewriting; extend an existing helper/component (new prop/variant) instead of forking a copy.
- **Match the surrounding code**: naming, file layout, comment density, hook/query/mapper patterns, error handling, import style (`#src/...` alias). Open a neighboring feature and mirror it. The result must look like one author wrote the whole repo.
- **Keep it small and clean.** No speculative abstractions, no unused props/exports/deps, no dead code left behind — delete what you replace. Comments only where the *why* is non-obvious.
- **OOP / classes only where they genuinely fit** (e.g. a stateful service/registry with a clear lifecycle). Otherwise follow the repo's idiom: function components, hooks, plain typed functions and mapper modules. Apply SOLID-style separation: UI renders, `model/` holds types/schemas/pure logic, `api/` talks to the backend, `queries/` wraps TanStack Query. Do not force classes into React code.
- Subagents get these same rules in their brief, and their diffs are checked for duplication before acceptance.

## 1. Stack

React 18 + TypeScript (strict) + Vite 6, Ant Design 5 / ProComponents, Tailwind 3 (`preflight: false`, colors from AntD tokens), TanStack Query 5, Zustand, React Router 7, React Hook Form + Zod, `ky` HTTP client, i18next, dayjs + Jalali, Tiptap (contract-template editor), ECharts. Package manager **pnpm** (`pnpm@10.6.4`); do not use npm/yarn.

Tailwind breakpoints are the AntD ones (`xs 480 / sm 576 / md 768 / lg 992 / xl 1200 / 2xl 1600`). Layouts must work on phone through desktop: no horizontal page overflow, multi-column grids collapse (see `aligned-form-grid--*`), touch targets ≥ 44px, no hover-only affordances.

## 2. Directory structure

```
src/
  api/            # cross-app API (common, user, system, notifications) + shared types
  components/     # generic app-wide components (basic-table, basic-form, basic-button, …)
  shared/ui/      # redesigned shared presentation (SectionCard, DashedCard, rhf-pro, …)
  shared/lib/     # dayjs-jalali, query-client
  features/<domain>/
    api/          # *.api.ts, *.dto.ts, *.mappers.ts — the only place that calls the backend
    queries/      # TanStack Query hooks/keys (or shared/queries/)
    model/        # types, zod schemas, pure domain logic (+ *.test.ts next to it)
    ui/ | pages/  # pages and feature-only components
    shared/       # used by 2+ sub-flows of this feature (create/list/preview/…)
    index.ts      # public entry
  hooks/ store/ router/ layout/ locales/ styles/ utils/ constants/
```

- Sub-flows inside a feature (`create/`, `list/`, `preview/`, `report/`) each own their `ui/`, `model/`, `queries/`. Promote to `<feature>/shared/` only when a second sub-flow imports it; to `src/shared/` or `src/components/` only when a second feature does.
- Generic presentation lives in `src/shared/ui`; **do not import another feature's files just to reuse generic UI**.
- Do not create `utils.ts` junk drawers; name files by what they do. A folder should hold more than one file.
- Components: `PascalCase.tsx`; other modules `kebab-case`/`camelCase` matching the neighbors in that folder; types `PascalCase` without `I` prefix.
- Data flow: page → query hook → `api/` function → mapper (DTO ↔ domain type). Components never call `ky` directly and never use raw DTOs.

## 3. TypeScript & React

- `strict` stays on; no `any` (use `unknown` + narrowing; one-line comment if truly unavoidable). Props typed with explicit `interface`/`type`.
- Forms: React Hook Form + Zod schema in `model/`, inputs from `rhf-pro`; validation messages via i18n.
- Server state in TanStack Query (no `useEffect` fetching); client state in Zustand only when it is genuinely global.
- Permissions go through `src/components/access-control` / `use-access` — do not hand-roll role checks.
- Run `pnpm typecheck` and `pnpm lint` before calling work done (`vite dev` does not type-check). Run `pnpm test` when touching `model/` logic that has tests.

## 4. Contract-template editor ⟷ signing PDF (do not break)

The editor (`src/features/contract-templates`, also reused by `ContractTemplateEditorModal.tsx`) saves `content_html` + `header`. `generatePdfBlob` screenshots `.ms-word-editor` with html2canvas, slicing pages at `hr, .page-break` + 1123px (page 794×1123); that PDF is uploaded (`requestOfficialPdf`) to start the official signing flow, which a colleague owns. Any change to pagination, canvas DOM classes, page geometry, `span[data-variable]` markup or the saved payload must keep both the print and sign-flow consumers working. Share geometry constants from one module.

## 5. Workflow

- Branches are `NDP-<ticket>-<slug>`; commits follow Conventional Commits (commitlint + lint-staged run on commit via simple-git-hooks). Never skip hooks.
- Do not touch `.env*`, `scratch/`, or the root-level one-off `*.cjs` scripts as part of feature work.
- Reply to the user in Persian. Delegate easy, mechanical parts to Sonnet subagents; keep design-heavy work yourself.

## 6. Pre-change checklist

1. Did I look for an existing component/helper/query first, and reuse it?
2. Does it look like the rest of the system (structure, spacing, tokens, copy tone) — as if the original designer drew it?
3. Any hard-coded color, string, or Gregorian date? Replace with token / i18n / Jalali.
4. Is the code placed in the right layer and folder, mirroring a neighbor feature?
5. Any duplicated logic or leftover dead code? Remove it.
6. Responsive + RTL checked; `pnpm typecheck` and `pnpm lint` pass.
7. Touching the template editor/PDF? Re-read section 4.

## 7. Browser automation (Playwright) and QA sessions — keep the machine light

Applies to every session and subagent that drives a browser. Many headless Chromium processes plus the celery workers saturated the host before.

- **Never launch your own Chromium when a shared one exists.** Check `pgrep -fc chrome-headless-shell`. The shared browser is started by `docs/qa-findings/_scripts/shared-browser.cjs` (`ws://127.0.0.1:9333/qa`); if it is not running, start it once in the background. Connect with `chromium.connect(...)` and use your own `browser.newContext()` (private localStorage/tokens). Example: `docs/qa-findings/_scripts/shared-browser-client-example.cjs`.
- One context and one page at a time. Batch several checks into one script run instead of many tiny runs. Screenshots only when needed. Keep a single vite dev server.
- Always `await ctx.close()` in `finally`. Never close the shared browser or `pkill` Chromium while another session may be using it; only kill orphaned `chrome-headless-shell` processes when no QA session is running, and say so.
- Prefer API calls (curl/requests, tokens via `docker exec -i negahcore-web python manage.py shell`) for checks that do not need the UI.
- QA findings go to `docs/qa-findings/` in the repo (not `/tmp`, which resets); keep `INDEX.md` current; helper scripts live in `docs/qa-findings/_scripts*/` and are never committed; delete token files (`tok.json`) at the end.
