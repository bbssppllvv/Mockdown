# sketch2md Roadmap

Status: active
Owner: KjellKod (maintainer)
Last updated: 2026-05-20

This roadmap supersedes the shelved [`cloudflare-deployment.md`](./cloudflare-deployment.md). Cloudflare hosting is un-shelved as Phase 4 with explicit "interim, transformable" framing. The long-term Rust ambition stays on the back of the calendar; see Phase 10+.

## Purpose

Sequence the sketch2md work into PR-sized phases so an agentic pipeline (Quest + multi-reviewer + worktrees) can drive multiple PRs end-to-end without human checkpoint between every change. Every phase must leave `main` in a deployable, green-CI state.

## Product Target

A browser-first ASCII wireframe editor that produces clean Markdown for AI agents. Companion to [doc2md](https://github.com/KjellKod/doc2md): doc2md turns existing docs into Markdown, sketch2md turns ideas into Markdown.

Hosted at a KjellKod-owned domain on Cloudflare during the entire TS/Next era. Long-term: same UX, ported to Vite, wrapped with Tauri, with the scene-graph core eventually in Rust. The product visible to users never breaks during these migrations.

## Cross-link with doc2md

Both products surface a `Copy as Markdown` action. Both link to each other from their respective working-mode chrome. They do **not** merge — see the [doc2md/sketch2md analysis](./sketch2md-doc2md-analysis-2026-05-20.md) for the reasoning. (Analysis lives only here for now; if it stays load-bearing, fold it into `docs/`.)

## Quality Gates (applies to every phase)

Every PR must pass, locally and in CI, before agentic merge is permitted:

1. `npm run lint` — ESLint with `@typescript-eslint/no-explicit-any: error` and `@typescript-eslint/no-unused-vars: error`.
2. `npm run typecheck` — `tsc --noEmit`, strict already on.
3. `npm test` — Vitest unit suite. **No PR may reduce coverage on touched files.**
4. `npm run test:e2e` — Playwright smoke + scenario tests (added in Phase 0).
5. `npm run build` — Next build green.
6. Codex CI review (already wired in `.github/workflows/codex-ci-review.yml`) plus a local pre-PR Claude review pass.
7. Two internal reviews (Codex + Claude) **before** PR is opened, not as the last step.

A PR that needs `// eslint-disable` or `// @ts-expect-error` must justify it in the PR body. Drive-by `any` is rejected.

## Phase Overview

| Phase | Status | Goal | Blocks |
|---|---|---|---|
| 0. Roadmap + Quality Gates | active | This doc + Playwright scaffold + stricter ESLint + pre-PR review loop. | All downstream phases. |
| 0.5. Metadata integrity fix | active | Tiny standalone PR purging `mockdown.design` from `metadataBase`, OpenGraph URLs, canonical URLs, OG image refs. **Lands before Phase 4 deploy.** | Phase 4. |
| 1. Identity flip (brand + mascot + promo + About) | planned | Every "Mockdown" string → sketch2md; canonical domain wired; cat → `sketch2mdLogo`; Refero promo → doc2md/quest; About page rewritten with honest Mike Bespalov credit. | Phase 4. |
| 2. Test fixturization | planned | Convert every known bug into a failing Vitest test before any fix lands. | Phase 3. |
| 3. Bug fix wave | planned | Make every Phase-2 fixture green. | Phase 5+. |
| 4. Cloudflare hosted deployment (interim) | planned | Public deploy on a KjellKod-owned Cloudflare domain. Un-shelves [`cloudflare-deployment.md`](./cloudflare-deployment.md) with explicit transformability. | Public visibility. |
| 5. UX P1/P2 fixes from /ux-review | planned | Toolbar reorganization (UI vs Draw). Other surfaced UX nits not covered by Phase 1. | UX lift. |
| 6. Editor behavior baseline | planned | Double-click selects word, click-drag selects range, keypress-while-frozen fixed (covers bug2/bug3). | Phase 7+. |
| 7. Editable text inside UI components | planned | Tab labels, table headers, breadcrumb segments editable in place. Borders/structure stay locked. | "Feels broken" moment removed. |
| 8. Tool modes (pencil/arrow/fill) | planned | Pencil: thin + bold. Arrow: small/big line + small/big head. Fill: solid/shade/light. | Drawing parity with comparable tools. |
| 9. AI rework | planned | Replace heuristic mode detection with explicit Add-area vs Adjust-item flows + optional clarifying-question loop + YOLO escape hatch. | AI usefulness. |
| 10. Block letters | planned | Port the 5-line ASCII font from `quest/scripts/quest_celebrate/ascii_art.py`. Optional larger variant. | Feature parity ask. |
| 11. Cross-link with doc2md | planned | Bidirectional surface links + shared `Copy as Markdown` pattern. `Open in doc2md →` for preview (see §"Preview decision" below). | Cohort experiment. |
| 12. AI BYOK | planned | "Use your own OpenRouter key" toggle. Removes the in-memory rate-limiter as user-visible failure mode. | Reliability. |
| 13. Vite migration | future | Replace Next.js with Vite. AI proxy moves to a Cloudflare Worker. | Phase 15. |
| 14. Hosted backend slim-down | future | AI proxy → Cloudflare Worker; PartyKit stays on its own Worker. Pages becomes static. | Phase 15. |
| 15. Tauri desktop wrap | future | Rust shell + system webview reuses the same React UI. BYOK only. Offline-except-AI. | — |
| 16. Rust scene-graph core (WASM) | speculative | Lift the scene graph + grid renderer into a Rust crate compiled to WASM. Verified against Phase-2 fixtures. | — |

---

## Phase 0: Roadmap + Quality Gates

**Scope:**

- This roadmap document, reviewed and approved.
- Add Playwright as a dev dependency. Configure with the project's existing browser baseline pattern (Chromium-only by default; matches doc2md's deliberate choice in `ideas/doc2md-multibrowser-playwright.md`).
- Add `tests/e2e/` with three baseline smoke tests:
  1. Page renders the editor without errors.
  2. Drawing a box and clicking `Copy Markdown` writes a code-fenced grid to the clipboard.
  3. Theme toggle persists across reload.
- Tighten `eslint.config.mjs`:
  - `@typescript-eslint/no-explicit-any: error`
  - `@typescript-eslint/no-non-null-assertion: error`
  - `@typescript-eslint/consistent-type-imports: warn`
- Add `npm run test:e2e` script + CI job.
- Document the pre-PR internal-review loop in `CONTRIBUTING.md` (Codex + Claude review *before* PR opens; quest's `pr-assistant` skill is the entry point).

**Done when:**

- `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build` is green locally and in CI on every PR.
- A second-author PR review (Claude + Codex) is required, but happens inside the Quest pipeline before the PR is filed publicly.

**Validation:**

- Smoke Playwright suite passes on Chromium headless in CI.
- Lint refuses to merge a PR that introduces `any`.

## Phase 0.5: Metadata integrity fix (tiny pre-Phase-1 PR)

**Why this is a separate PR ahead of Phase 1:** the brand-flip PR is multi-file and will take a review pass. The metadata leak is a 10-line surgical change that fixes a real integrity problem and should not wait. Lands today.

**Scope:**

1. **`metadataBase`** in `src/app/layout.tsx:14`: `new URL('https://www.mockdown.design')` → `new URL('https://sketch2md.dev')`.
2. **OpenGraph image refs.** Audit `src/app/layout.tsx` and `src/app/about/page.tsx` for any image URLs that are relative or that explicitly reference `mockdown.design`. Two options per ref:
   - Make them absolute pointing at our own asset (e.g., `https://sketch2md.dev/og-image.png`) if the asset exists.
   - Remove the field entirely if no asset is bundled yet — Next.js can render OG cards without images, and we'll add a proper sketch2md OG asset as part of Phase 1.
3. **Twitter/X card URLs**: same audit. Anything resolving to `mockdown.design` removed or repointed.
4. **PWA manifest**: `start_url`, `scope`, any `icons[].src` paths checked. Manifest currently uses relative paths (`/`) which resolve against the host serving the manifest, not metadataBase — so those are likely fine, but verify in this PR.
5. **JSON-LD payload** (lines ~55 in `layout.tsx`): any `url` field pointing at `mockdown.design` updated.

**Done when:**

- `grep -r mockdown.design src/` returns nothing.
- Rendered `<link rel="canonical">`, `<meta property="og:url">`, `<meta name="twitter:url">`, and any OG/Twitter image meta tags either point at `sketch2md.dev` or are absent.
- No request from our pages (local dev or otherwise) resolves to `mockdown.design`.

**Validation:**

- Vitest test that imports the metadata module(s) and asserts no string contains `mockdown.design`.
- Playwright smoke test (added in Phase 0) that visits `/` and `/about`, parses the rendered head, and asserts every absolute URL points either at the current origin or at an allowed external domain whitelist (which excludes `mockdown.design`).

**Note on Vercel vs Cloudflare for this PR:** this is a code change, not a deployment change. It applies identically whether we deploy to Cloudflare Pages or Vercel. See Phase 4 for the hosting decision.

---

## Phase 1: Identity flip (brand + mascot + promo + About)

Bundled into one PR cluster because the affected files overlap (StatusBar, About, manifest, layout, Toolbar). One worktree, one review pass, lower churn.

**Scope:**

### 1a. Brand strings + integrity fix
- **Priority fix:** `src/app/layout.tsx:14` currently has `metadataBase: new URL('https://www.mockdown.design')`. That domain belongs to Mike Bespalov (upstream author); we are not affiliated. Every OpenGraph card, canonical URL, and social-share preview from sketch2md today points at his domain. **Change `metadataBase` to `https://sketch2md.dev` first**, before any other rename. This is an integrity fix — we should not be stamping metadata onto someone else's property.
- Replace every "Mockdown" string in `src/app/{layout,page,manifest}.tsx`, `src/app/about/page.tsx`, status bar, jsonLd payload.
- Canonical domain: `sketch2md.dev` (purchased 2026-05-20). Wire it as `metadataBase`, OpenGraph URL, manifest start_url.
- **No 301 redirect from `mockdown.design`** — that domain is not ours and we have no relationship to it. sketch2md.dev starts with fresh SEO.

### 1b. Mascot replacement (`sketch2mdLogo.tsx`)
- New file `src/components/editor/sketch2mdLogo.tsx` mirrors `CatLogo.tsx`'s animation engine but with a new face dictionary.
- Delete `src/components/editor/CatLogo.tsx`. No easter-egg fallback.
- Starting mood set (8 candidates; subset survives `/ux-review`):

  ```
  idle:        (•  ‿  •)       neutral, friendly
  focused:     (•  ·  •)       tighter mouth, concentrating
  happy:       (v  ‿  v)       Copy Markdown clicked
  sparkle:     (✦  ‿  ✦)       AI streaming
  sleepy:      (—  ‿  —)       idle > 60s
  proud:       (^  ‿  ^)       long session, many undos behind you
  surprised:   (o  o  o)       error / unexpected
  yawn:        (—  o  —)       very long idle
  ```

- **Rule:** any mood where a first-time user wouldn't read the face within a glance gets dropped, not negotiated. Final set may be 6 not 8.
- **Event coupling** (Concept D): mood reflects editor state. Mappings:
  - `copyAsMarkdown` action → `happy` for 1.5s
  - AI streaming active → `sparkle` until stream ends
  - Idle > 60s without action → `sleepy`
  - Idle > 180s → `yawn`
  - Undo stack count > 20 → `proud` on next render
  - Error toast → `surprised` for 1.5s
  - Otherwise random rotation between remaining moods (preserves the existing delight pattern)

### 1c. Promo + cross-link swap
- `StatusBar.tsx`: remove Refero MCP block (lines 25–40). Replace with two lower-contrast cross-links: `Try doc2md →` and `Try quest →`. Reserve brand blue for the active-tool pill only.
- `/about` Refero promo (lines ~530–535) → same swap.

### 1d. About page rewrite (targeted, not structural)
- Same layout, smaller deltas:
  - Every "Mockdown" → "sketch2md".
  - Origins paragraph rewritten with warm honest Mike Bespalov credit: "We forked Mockdown by Mike Bespalov, kept the scene-graph core and the editor's bones, and are evolving the AI workflow and reliability for agent-first use." Plus a working link to the original repo.
  - Author credit in `StatusBar.tsx:46` (`@bbssppllvv`) → maintainer X: [`@SwedeKjellKod`](https://x.com/SwedeKjellKod) (display name "Kjell").
  - Promo cards updated alongside 1c.
- **Maintainer social block** on /about (footer or sidebar):
  - GitHub: [KjellKod](https://github.com/KjellKod) — keep prominent.
  - X: [`@SwedeKjellKod`](https://x.com/SwedeKjellKod).
  - LinkedIn: [linkedin.com/in/kjellkod](https://www.linkedin.com/in/kjellkod/).
  - The X link being live carries an implicit commitment to post; a dead handle reads worse than no handle. Maintainer is aware.
- No Ukraine references anywhere (rotation, About, copy).

**Done when:**

- `grep -r Mockdown src/` returns nothing.
- `grep -r CatLogo src/` returns nothing.
- PWA installs with name `sketch2md`; manifest `start_url` points at the chosen domain.
- OpenGraph + Twitter cards advertise sketch2md.
- `/ux-review` against rendered mascot states reports no P0/P1 signifier findings; any flagged mood is dropped before merge.
- About page renders Mike Bespalov credit prominently with working link.
- Refero references absent from `src/`.

**Validation:**

- Playwright test: `<title>` contains `sketch2md`; PWA manifest `name` matches; no occurrence of `Mockdown` or `Refero` in rendered DOM at `/` or `/about`.
- Vitest snapshot tests in `tests/unit/sketch2mdLogo.test.tsx` for every surviving mood.
- Vitest behavioral test: triggering each event (copy-as-markdown action, AI stream start/end, idle timer) transitions the mascot to the expected mood.
- `/ux-review` artifact stored in the PR with the rendered mood gallery and the pass/drop list.

## Phase 2: Test fixturization

**Scope:**

- Take the bug list (delivered by Kjell or harvested from issues/PRs) and produce **one Vitest test per bug**. The test name follows the convention `bug: <short symptom>`. Each test is initially `.failing` (or marked skipped with a TODO) until Phase 3 lands the fix.
- Where the bug spans the rendered grid, snapshot the expected text grid as the assertion.
- Where the bug spans interaction (Select tool, undo, resize, line tool jitter), write the failing test against the scene store actions directly — no need to drive the UI for unit-level repro.

**Done when:**

- Every known bug has a failing test, **or** a "needs-repro-from-Kjell" entry in this phase's tracking section with the specific repro question.
- Vitest run lists N failures matching N bugs.

**Validation:**

- A research agent runs the failing-test list against the latest `main` to confirm they fail today.

## Phase 3: Bug fix wave

**Scope:**

- One PR per logical bug cluster (not one PR per bug; group by region of the scene store / tool).
- Each PR makes its Phase-2 tests pass and adds adjacent regression coverage.

**Done when:**

- Every Phase-2 test is green.
- No flaky test in three consecutive CI runs.

## Phase 4: Cloudflare hosted deployment (interim)

### Hosting choice (decided 2026-05-20)

**Cloudflare Pages**, not Vercel. Sanity check considered both:

| Concern | Cloudflare Pages | Vercel |
|---|---|---|
| `sketch2md.dev` DNS | Already at Cloudflare — custom domain is one-click | CNAME from Cloudflare to Vercel — works, but adds a vendor + a hop |
| Next.js support | Via `@opennextjs/cloudflare` (mature; some edge runtime caveats) | Native (zero adapter) |
| AI route (`/api/generate`) | Runs as a Pages function on the edge runtime. `@ai-sdk/openai` streams are compatible. | Native edge function |
| PartyKit Worker | Same vendor (PartyKit deploys to CF Workers natively) | Separate vendor → split console + billing |
| Cost at our usage tier | $0 (Pages free tier + Workers free tier) | $0 (Hobby tier) but stricter bandwidth caps |
| Vendor count | 1 (everything in Cloudflare) | 2 (Vercel + Cloudflare for PartyKit) |

**Decision:** Cloudflare. One vendor, one console, one billing relationship, one place to revoke secrets. The Next.js adapter caveats are well-understood and don't affect any code path we ship today. Vercel's only real win is preview-deploy polish, which is solvable with a GitHub Action.

### Architecture

```
GitHub (KjellKod/sketch2md)
    │ push to main → production
    │ push tag vX.Y.Z → production with release version pin
    │ open PR → preview deploy
    ▼
GitHub Actions workflow
    │
    ▼
Cloudflare
    │
    ├── Pages project "sketch2md"
    │       │ build: @opennextjs/cloudflare → .open-next/worker
    │       │ routes: /, /about, /api/generate, /sitemap.xml, /robots.txt
    │       │ custom domain: sketch2md.dev
    │       │ env: OPENROUTER_API_KEY (encrypted), NEXT_PUBLIC_PARTYKIT_HOST
    │
    └── Worker "sketch2md-collab" (PartyKit)
            │ wss://<party-name>.<account>.partykit.dev
            │ deployed via `npx partykit deploy`
```

### Human steps (one-time)

These cannot be automated; the maintainer (Kjell) does them once:

1. **Cloudflare account verification.** Existing account (already paying for the domain) is fine; no new tier needed.
2. **Create Pages project.** Cloudflare dashboard → Pages → `Create project` → connect GitHub → `KjellKod/sketch2md`. Production branch: `main`. Build command: `npx @opennextjs/cloudflare build`. Build output: `.open-next/worker`.
3. **Attach custom domain.** Pages → custom domains → add `sketch2md.dev` (and optionally `www.sketch2md.dev`). DNS auto-configures because the domain is already in CF DNS.
4. **Create Cloudflare API token.** Cloudflare dashboard → My Profile → API Tokens → Create Token with `Pages:Edit` + `Workers:Edit` scopes. **Save the token once.**
5. **Create GitHub environments.** In `KjellKod/sketch2md` repo settings → Environments:
   - `cloudflare-pages-production` (protected, requires Kjell as reviewer for v0.x; relax later if desired)
   - `cloudflare-pages-preview` (no protection — every PR gets a preview)
6. **Add secrets per environment.** In each env: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY`.
7. **Deploy PartyKit Worker.** Locally: `npx partykit deploy --name sketch2md-collab`. Capture the worker host (`sketch2md-collab.<account>.partykit.dev`).
8. **Set Pages env vars.** In the Pages project settings, add `NEXT_PUBLIC_PARTYKIT_HOST = sketch2md-collab.<account>.partykit.dev` for both production and preview.

### Release-triggered deploy (automated)

Two CI workflows in `.github/workflows/`:

- `pages-preview.yml`: triggers on `pull_request: opened|synchronize|reopened` against `main`. Builds via `@opennextjs/cloudflare`, deploys to the preview environment, comments the preview URL on the PR.
- `pages-production.yml`: triggers on `push: tags: [v*]` (tag pattern `vX.Y.Z` — semver, no leading-`v` variant). Builds, deploys to production, creates a GitHub release with the changelog auto-generated from commits since the previous tag.

**Tag convention:** `vX.Y.Z` (with leading `v`). Picked because:
- Matches doc2md's existing convention (consistency between products).
- Distinguishes tag refs from branch names cleanly in CI globs.
- Semver only — no pre-release suffixes until we need them.

Production deploys gate on:
1. All five quality checks green (lint, typecheck, vitest, playwright, build).
2. Tag is on a commit that's currently `main`'s HEAD or an ancestor of `main` — never deploy a tag pointing at a branch that hasn't been merged.
3. `cloudflare-pages-production` environment review (Kjell approves the first few deploys, then we can drop the gate).

### Done when

- Live URL `https://sketch2md.dev` serves the editor.
- Magic tool works (AI streaming against OpenRouter via the Pages function).
- Multiplayer cursors work between two browsers (PartyKit Worker live).
- Preview deploys generated per PR with a unique URL.
- A tag push to `vX.Y.Z` triggers production deploy + GitHub release without human intervention.

### Validation

- Playwright suite runs against the live preview URL on every PR (separate CI job, gated on `cloudflare-pages-preview-ready` event).
- Production deploy validated with a post-deploy Playwright smoke test against `https://sketch2md.dev`.
- Cloudflare Analytics dashboard verified non-empty within 24h of first traffic.

### Prerequisites that must land before Phase 4 starts

1. Phase 0.5 (metadata integrity fix) merged — we will not deploy a site whose canonical URL points at someone else's domain.
2. Phase 0 (Playwright + quality gates) merged — production deploys must run the suite.
3. Phase 1 (identity flip) optionally merged — the site can technically deploy mid-flip, but the first public deploy should be fully sketch2md-branded for a clean launch. Recommendation: Phase 1 lands first; v0.1.0 tag is the first deploy.

## Phase 5: UX P1/P2 fixes from /ux-review

**Scope:** (driven by the [/ux-review report](./sketch2md-doc2md-analysis-2026-05-20.md))

- Demote Refero promo from brand-blue active-tool-pill color in `StatusBar.tsx`. One PR.
- Toolbar reorganization: separate "UI Elements" tab from "Draw" tools. Two distinct mental models, two surfaces.
- Replace fuzzy `UI_KEYWORDS` mode detection in `GeneratePrompt.tsx` with an explicit mode toggle. One PR.
- Verify Mac shortcut handling (`⌘W`, `⌘Q`, `⌘,`) before Phase 10 desktop work.

## Phase 6: Cross-link with doc2md

**Scope:**

- Add a `Sketch a UI →` link in doc2md's `WorkingModeBar.tsx`.
- Add a `← Convert a doc` link in sketch2md's About + idle-canvas hint.
- Optionally extract a small shared `@kjellkod/md-clipboard` npm package owning the `Copy as Markdown` UX.

**Done when:**

- Both products link to each other in chrome.
- Click-through tracked (Cloudflare Analytics, no user PII).

## Phase 7: AI BYOK

**Scope:**

- Settings panel with "OpenRouter key" field (stored in `localStorage`, never sent server-side).
- When a key is present, the client calls OpenRouter directly; the server proxy is bypassed.
- Server proxy keeps the anonymous free tier (the in-memory limiter remains, but is only the fallback path, not the headline path).

**Done when:**

- BYOK users never hit the rate limit.
- Anonymous users still get the demo.

## Phase 8: Vite migration

**Scope:**

- Replace `next` with `vite` + `react`. `'use client'` directives drop. Static assets adjust.
- `/api/generate` either moves to a Cloudflare Worker (preferred, see Phase 9) or stays on a separate small Next instance.
- Update CI workflows; remove Next-specific steps.
- Verify Playwright suite passes against Vite dev + preview builds.

## Phase 9: Hosted backend slim-down

**Scope:**

- AI generation moves to a dedicated Cloudflare Worker.
- PartyKit Worker stays (already a Worker).
- Pages becomes pure static export.

## Phase 10: Tauri desktop wrap

**Scope:**

- Add `apps/desktop/` (Tauri 2). Rust shell, system webview.
- Bundle the Vite static build at compile time.
- BYOK key stored in macOS Keychain via Tauri secure-storage plugin.
- Signing + notarization later; first milestone is a working unsigned local build.

**Done when:**

- `cargo tauri dev` opens a window with the full editor.
- BYOK key persists across launches.

## Phase 11: Rust scene-graph core (speculative)

**Scope:**

- Extract `src/lib/scene/` and `src/lib/grid-model.ts` into a Rust crate.
- Compile to WASM. React calls into the WASM module for scene mutations + rendering.
- All Phase-2 fixtures must pass byte-equivalently against the WASM core before this phase ships.

**Gate:** Only execute if the JS scene graph becomes a measurable bottleneck *or* if Phase 10 needs cross-platform native renderers. Otherwise YAGNI.

---

## Bug list (Phase 2 — to be reproduced as failing tests)

| # | Symptom | Component (suspected) | Test fixture path | Status |
|---|---|---|---|---|
| bug1 | Text pasted into a text block that exceeds grid width is truncated, not wrapped. The truncated output is honestly reflected in `Copy Markdown`, so the copy is *accurate but wrong*: users expect wrap. | `src/lib/scene/text-editing.ts`, `src/components/tools/text.ts` | `tests/unit/text-block-wrap.test.ts` | needs-repro |
| bug2 | Click (single or double) inside a pasted text block does not always move the cursor to the click location. Non-deterministic; sometimes works, sometimes the block becomes uneditable. | scene store text editing actions, hit-test routing | `tests/unit/text-block-click-cursor.test.ts` | needs-repro |
| bug3 | Text block enters a "selected" (blue) state where keypresses do nothing; switching to another block does not recover. Frozen state. | `selectInteraction === 'editing'` state machine in `use-scene-store.ts` | `tests/unit/text-block-frozen-state.test.ts` | needs-repro |

Phase 2 acceptance: each row above has a committed failing test in `tests/unit/`. If a research agent cannot repro, the row moves to `needs-repro-from-Kjell` with a specific repro question.

## Editor Behavior Baseline (Phase 6 detail)

Today the editor implements partial editor semantics, which is worse than none — users assume the rest works and hit dead ends. The minimum acceptable set:

- **Single click** inside a text block moves cursor to that position. (Currently flaky; fixed alongside bug2.)
- **Double click** selects the word under the cursor. (Missing.)
- **Click-drag** selects a character range. (Missing.)
- **Shift+arrows** extends selection. (Missing.)
- **Selected text + keypress** replaces selection. (Missing.)
- **Cmd/Ctrl+A** selects all text within the current text block, not the canvas. (Verify.)

Out of scope: full rich-text editor features. We deliberately stop short of CodeMirror/ProseMirror complexity. See "Preview decision" below for the reasoning.

## Editable Text Inside UI Components (Phase 7 detail)

Today: tabs, tables, breadcrumbs, modals can be **placed**, but their labels are **locked**. This is the highest-leverage "feels broken" moment in the editor — every user hits it.

Scope:

- Double-click a label slot on a tab/table-header/breadcrumb/modal-title enters in-place edit mode for that slot only.
- Borders, dividers, and structural box-drawing characters remain non-editable from in-place edit mode (move/resize tools still own them).
- Re-rendering rules: editing a tab name should not reflow the other tabs unless the new label is wider than the slot; in that case the tab grows and triggers a re-layout pass via the existing scene store action.

Affected tool files in `src/components/tools/`: `tabs.ts`, `table.ts`, `breadcrumb.ts`, `nav.ts`, `modal.ts`, `card.ts`, `button.ts`, `dropdown.ts`, `pagination.ts`, `progress.ts`, `list.ts`.

## Tool Modes (Phase 8 detail)

| Tool | Today | Add |
|---|---|---|
| Pencil | One mode: thick/bold stroke. | Thin (single-char width) variant. Mode toggle in tool settings. |
| Arrow | One mode: small line + small head. | Combinations of {small, big} line × {small, big} head. Four variants min. |
| Fill | One mode: solid dark fill. | Solid + shade (mid-density) + light (sparse). Same affordance as Shade/Spray density. |

Tool settings already live in `src/lib/tool-settings.ts`; extend the schema rather than duplicating tools.

## AI Rework (Phase 9 detail)

The current `Generate` flow is one path: select a region, free-text prompt, AI fills the region. Problems:

- No "adjust this existing element" path.
- No clarifying-question loop when the prompt is ambiguous.
- Generated elements often misalign with the surrounding grid.
- Heuristic UI-keyword detection picks the wrong mode (see [/ux-review report's P3 finding](./sketch2md-doc2md-analysis-2026-05-20.md), if filed).

**Two-mode AI surface:**

- **Add-area mode (A):** Select a rectangular region of empty canvas. Prompt the AI. AI may ask up to N clarifying questions (configurable, default 2) before generating. **YOLO toggle** in the prompt UI skips clarification.
- **Adjust-item mode (B):** Right-click an existing element → `AI adjust…`. Free-text prompt operates on that element only. Same clarifying-question option + YOLO escape.

**Alignment fix:** When the AI returns scene nodes for Add-area, snap their output to the grid + the surrounding sibling elements' baselines before applying. This is a post-processing pass in `src/lib/ai-structured.ts`, not a model-side change.

**Clarifying-question protocol:** When the model's confidence in the prompt is below threshold, return a JSON shape `{ questions: [string], proposal: SceneNode[] }`. The UI shows the questions inline as a small chat thread; pressing "YOLO / generate anyway" applies `proposal` without questions.

## Block Letters (Phase 10 detail)

Source: `quest/scripts/quest_celebrate/ascii_art.py` — 5-line tall block letter font, A-Z + 0-9 + space + hyphen.

Port:

- New tool `block-text` under `src/components/tools/`.
- Reuse the font data verbatim (small JSON or TS const). Document provenance in the file header.
- Tool setting: `size: 'small' | 'large'`. Small uses the existing 5-line font. Large optionally renders a 9-line variant (post-MVP, gate on user demand).
- Generated block letters become a single scene node with `kind: 'text-art'`, snapped to grid.

## Preview Decision (push back required)

You asked: "If sketch2md has a preview, wouldn't it be a full-blown editor then? ... maybe this IS what we should do?"

**Recommendation: no inline preview. Cross-link to doc2md instead.**

Reasons:

1. **The source IS the preview.** sketch2md's output is ASCII inside a fenced code block. Markdown renders it monospace inside a code block. A preview pane would show the same characters in the same font.
2. **The moment you add Markdown features beyond the grid** (# headings, **bold**, lists, checkboxes), you've started building doc2md. doc2md already does this — and on three surfaces (web, Mac, npm). Don't fork the work.
3. **Cognitive positioning.** Today sketch2md has a sharp story: "draw UI, copy markdown, paste into agent." A preview pane reframes it as "another markdown editor." You lose the wedge.
4. **Maintenance.** A preview means a markdown parser (remark/rehype), CSS for rendered text, mobile responsive preview pane. That's a permanent tax on a product whose value is the editor.

**Counterpath that gets the same user benefit:**

- Add a `Open in doc2md →` action next to `Copy Markdown`. One click copies the markdown AND opens doc2md in a new tab with the content pre-loaded (via URL fragment or `postMessage` if same origin under your domain).
- doc2md's preview is already excellent at this. Let it do the job.

**The narrow case for inline preview:** If Phase 5+ adds `#`, `##`, `bold`, `strike`, `- [ ]`, `- list`, those produce markdown the user can't visually verify against the ASCII grid. Even then, prefer a *toggle* (hide canvas, show rendered) over a side-by-side pane, and keep it dismissible. **But you should not add those markdown features at all** unless they're load-bearing for an agent workflow. Today the ASCII grid alone is what the agent eats.

**Decision needed:** confirm "no inline preview, cross-link instead" or override with a specific use case.

## Branding (folded into Phase 1)

Promo swap, About rewrite, mascot replacement, and brand strings all live in Phase 1 above. See §1a–1d. The rule that governs every mascot mood: **if a first-time user wouldn't immediately read it as a face, drop it.** `/ux-review` enforces this before merge.

Excluded permanently from the rotation and the About page: Ukraine references, hunting iconography, identifying family info, trademarked logos.

### Maintainer social (decided 2026-05-20)

- **GitHub**: [KjellKod](https://github.com/KjellKod) — prominent everywhere it makes sense (status bar, About).
- **X**: [`@SwedeKjellKod`](https://x.com/SwedeKjellKod), display name "Kjell". Replaces `@bbssppllvv` in the status bar slot. Posting commitment understood.
- **LinkedIn**: [linkedin.com/in/kjellkod](https://www.linkedin.com/in/kjellkod/) — on /about.

## Locked decisions (2026-05-20)

1. **Canonical domain:** to be chosen from the cheap-and-available set — `sketch2md.dev`, `sketch2md.tools`, `sketch2md.app`, `sketch2md.ai` (and similar). **Recommendation: `sketch2md.dev`** for symmetry with `doc2md.dev`, mandatory HTTPS (free TLS hygiene), and clean dev-tool positioning. Final pick before Phase 1 lands.
2. **Inline preview:** No. Cross-link to doc2md instead. `Open in doc2md →` next to `Copy Markdown`. (See Preview Decision above.)
3. **AI access model:** Anonymous + BYOK toggle. Free anonymous tier with rate-limit during Phases 4–11; Phase 12 ships BYOK toggle to remove user-visible rate-limit failures.
4. **Bug intake:** Three bugs delivered (bug1/bug2/bug3 above). Phase 2 begins immediately — research agent(s) reproduce each as a failing Vitest test in `tests/unit/`. Additional bugs added to this doc as they surface.

## Still open

- (none currently blocking; pre-Phase-1 metadata fix is in flight as Phase 0.5)
