# Deploying sketch2md on Cloudflare

Status: **shelved (2026-05-16)** — sketch2md will be developed and run locally
for the foreseeable future. A Rust rewrite is the intended long-term
direction, and the current TypeScript/Next.js codebase is interim. This
document is kept as a reference in case a public Cloudflare deploy ever
becomes useful before the Rust port lands. **Do not act on this plan
without explicit re-approval** — costs, account caps, and the rate-limiter
prerequisite in §6.5 must all be reconsidered at that time.

Audience: KjellKod (maintainer)
Last updated: 2026-05-16

This document is the full plan for hosting sketch2md on Cloudflare end-to-end:
the Next.js app on Cloudflare Pages, the PartyKit collab server on Cloudflare
Workers, secrets and environment variables, CI/CD wiring with SHA-pinned
actions, and the optional GitHub Pages static demo on the side.

It does not assume any prior Cloudflare setup. It assumes the agentic CI
scaffolding already on `main` (`94525ee`, `c41e0db`).

---

## 1. Goal & scope

**In scope**

- Live, publicly reachable production site at a `*.pages.dev` URL (or custom
  subdomain) serving the full sketch2md UX, including AI-assisted generation
  and real-time collaboration.
- One-click git push deploys for `main`; PR preview deploys per pull request.
- CI/CD that is reproducible, auditable, and uses the same trust model as the
  rest of this repo (SHA-pinned actions, environment-gated secrets, separated
  trust zones).
- An optional static-export demo published to GitHub Pages, marketing-only.

**Out of scope (for this phase)**

- Sketch persistence to a database (D1) or object store (R2). Editor state
  remains in `localStorage` on the client.
- Authenticated multi-tenant collab (auth, rooms keyed by user). Today's
  PartyKit room model is anonymous + ephemeral.
- Self-hosted monitoring (CF Analytics is included for free).

---

## 2. Why Cloudflare for this app

You already plan to use Cloudflare for other work, so the colocation argument
is real:

| Concern | Cloudflare answer |
|---|---|
| Next.js host with edge functions | Cloudflare Pages + Workers runtime |
| PartyKit WebSocket server | PartyKit already deploys to CF Workers under the hood |
| Static assets / CDN | Free, baked in |
| Custom domain + TLS | Free for any zone you own on Cloudflare DNS |
| Per-request observability | Workers Analytics + Logs (free tier suffices) |
| Future data persistence | D1 (SQLite), KV, R2 (S3-compatible) — same dashboard |

The trade-off: Cloudflare Pages runs Next.js in **edge runtime** mode, which
means a subset of Node APIs is unavailable. `@ai-sdk/openai`'s streaming
response is compatible with edge — that's the route that matters here. Most
edge-incompatible packages in a typical Next.js app are dev-time or filesystem
related; we're already client-heavy.

---

## 3. Architecture overview

```
                    ┌──────────────────────────────────────────────────┐
                    │                  GitHub                           │
                    │  KjellKod/sketch2md                               │
                    │  main branch     │  CI workflows  │  Environments │
                    └─────────┬────────────────┬────────────────────────┘
                              │                │
                              │ push           │ deploy (workflow)
                              ▼                ▼
        ┌───────────────────────────────────────────────────────┐
        │                  Cloudflare                            │
        │                                                        │
        │  Pages project: sketch2md                              │
        │  ─────────────────────────                             │
        │  Build: @opennextjs/cloudflare → .open-next/worker     │
        │  Routes:                                               │
        │    /            (static) ─ React editor UI             │
        │    /about       (static)                               │
        │    /api/generate (edge fn) ─ calls OpenAI server-side  │
        │    /sitemap.xml (static)                               │
        │                                                        │
        │  Bound env:                                            │
        │    OPENROUTER_API_KEY           (encrypted, server only)   │
        │    NEXT_PUBLIC_PARTYKIT_HOST (public, baked into JS)   │
        │                                                        │
        │  ┌──────────────────────────────┐                     │
        │  │ PartyKit Worker (collab)     │ ◄── WS ─── browser  │
        │  │ npx partykit deploy          │                     │
        │  │ <party>.<account>.partykit.dev│                     │
        │  └──────────────────────────────┘                     │
        └───────────────────────────────────────────────────────┘
```

The browser talks to two Cloudflare endpoints:

1. `https://sketch2md.pages.dev` (or custom domain) — Next.js app
2. `wss://<party-name>.<account>.partykit.dev` — PartyKit collab room

The `/api/generate` server route fans out to `openrouter.ai/api/v1` from
inside the Pages function — `OPENROUTER_API_KEY` never reaches the browser.
OpenRouter then routes the request to the actual model provider (Google for
`gemini-2.5-flash`, MiniMax for `minimax-m2.5`) and bills our OpenRouter
account.

---

## 4. Prerequisites

Before any code changes:

1. **Cloudflare account** with the target domain (or accept `*.pages.dev`).
2. **Cloudflare API token** with the minimum scopes:
   - `Account` → `Cloudflare Pages` → `Edit`
   - `Account` → `Workers Scripts` → `Edit`
   - `Account` → `Account Settings` → `Read`
   - `Zone` → `Workers Routes` → `Edit` (only if using a custom domain)
   Token is **per-account**, not global. Store its plaintext in your password
   manager; we will copy it into a GitHub Environment secret, never commit it.
3. **Cloudflare Account ID** (from CF dashboard URL or `wrangler whoami`).
4. **PartyKit account** — if using the hosted PartyKit cloud (recommended for
   the first iteration). Otherwise set up a custom Workers deploy.
5. **OpenAI API key** with usage limits set (already required by current code).

---

## 5. Phase 1 — Next.js on Cloudflare Pages

### 5.1 Choose the adapter

There are two candidates and the right one as of late 2026 is
`@opennextjs/cloudflare` (the renamed successor to `@cloudflare/next-on-pages`,
which Cloudflare deprecated in favor of OpenNext). It supports App Router,
Server Components, streaming responses, and Route Handlers — all of which
sketch2md uses.

- Adapter: `@opennextjs/cloudflare`
- Required `wrangler.toml` (or `wrangler.jsonc`) for edge-runtime tuning
- `compatibility_date` set near today (e.g., `2026-05-01`)
- `compatibility_flags = ["nodejs_compat"]` so `@ai-sdk/openai` and `ai` work

### 5.2 Configure Next.js for the edge

`/api/generate/route.ts` must declare:

```ts
export const runtime = "edge";
```

(Verify this is already declared — most likely yes since it uses `@ai-sdk/openai`
streaming, but the deploy will fail loudly if it isn't.)

`next.config.ts` stays roughly as is. The adapter wraps the build — no
`output: "export"` (that's only for static Pages, see Phase 6).

### 5.3 Build wiring

```jsonc
// package.json
{
  "scripts": {
    "build:cf": "opennextjs-cloudflare build",
    "preview:cf": "opennextjs-cloudflare preview",
    "deploy:cf": "opennextjs-cloudflare deploy"
  }
}
```

`build:cf` produces `.open-next/worker.js` and the static asset manifest. That's
what gets uploaded to Pages.

### 5.4 Create the Pages project

Two options. Pick **B** for our purposes (matches the trust model of the rest
of the CI):

- **A. Git integration (zero-CI):** Connect repo via CF dashboard. CF runs the
  build inside CF's own builders, deploys on every push. Easiest, but build
  happens off-GitHub-Actions and you can't reuse the SHA-pinned, ignore-scripts
  CI hygiene we built.
- **B. Direct upload via CI (recommended):** GitHub Actions runs `build:cf` and
  `deploy:cf`. CF only sees a finished bundle. Build inputs (Node version,
  npm flags, env) are all controlled by our CI.

We go with B.

### 5.5 Environment variables on Pages

Set via `wrangler pages secret put` (encrypted) or via the CF dashboard:

| Name | Type | Scope | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | secret | production + preview | server-only, read by `/api/generate` |
| `NEXT_PUBLIC_PARTYKIT_HOST` | plaintext | production + preview | e.g., `sketch2md-party.kjellkod.partykit.dev`; baked into client JS |
| `NEXT_PUBLIC_APP_URL` | plaintext | per-env | for sitemap / og: tags |

Secrets in CF Pages can be scoped per-environment (`production`, `preview`).
Use **different** OpenAI keys for preview vs production so a prompt-injection
in a draft PR can't burn through the prod budget.

---

## 6. Phase 2 — PartyKit collab server

### 6.1 Two deploy options

| Option | Effort | Control | When to choose |
|---|---|---|---|
| **Hosted partykit.dev** (uses CF Workers under the hood) | `npx partykit deploy` and done | PartyKit team manages the worker lifecycle | First iteration. Recommended. |
| **Custom Workers via wrangler** | Author your own `wrangler.toml`, port PartyKit handler | Full control, single CF account billing | Only if you outgrow PartyKit's free tier or need custom routing |

Start with hosted PartyKit. Migration to custom Workers later is mostly a
deploy-pipeline change, not a code rewrite — the PartyKit handler API is
designed to be Workers-native.

### 6.2 PartyKit deploy

`partykit.json` already exists in the repo. The hosted deploy is:

```bash
npx partykit deploy --name sketch2md
```

This produces a public URL like:

```
sketch2md.<your-partykit-username>.partykit.dev
```

Set `NEXT_PUBLIC_PARTYKIT_HOST` in CF Pages to that URL (without protocol).
The client's `partysocket` resolves `wss://` automatically.

### 6.3 PartyKit auth (future)

Today's collab is anonymous. When you add accounts, PartyKit supports
per-room auth via signed tokens — out of scope here, but plan for it.

---

## 6.5 Phase 2.5 — Rate limiter rewrite (hard prerequisite)

**This must land before any public Cloudflare deploy. Do not skip it.**

`src/app/api/generate/route.ts` currently rate-limits in-memory:

```ts
const hits = new Map<string, number[]>();
// ...
setInterval(() => { /* cleanup */ }, 300_000);
```

That works on a long-lived Node server (like Vercel's serverless or a VPS).
**It does not work on Cloudflare Workers.** Workers are isolate-based: each
invocation may land on a different isolate, isolates are reclaimed
aggressively by the runtime, `setInterval` is not a portable concept across
isolate lifetimes, and there's no shared memory between concurrent regions.

Net effect of porting the route as-is: **the rate limiter silently does
nothing in production.** A single viral mention → unbounded OpenRouter spend
up to the account cap, which is your only remaining safety net.

### 6.5.1 Two valid replacements

| Strategy | Consistency | Code effort | When to choose |
|---|---|---|---|
| **Cloudflare KV** | Eventually consistent (per-region cache) | ~15 LOC | Default. Fine for "≤N requests per IP per minute" with relaxed bounds. |
| **Durable Objects** | Strongly consistent (one DO per IP) | ~50 LOC + binding | Choose if you need exact bounds and can pay a few μs of latency per request. |

Recommended for v1: **KV**. The under-counting under heavy concurrent
multi-region load is bounded by KV's edge-cache TTL (60s typical) — at worst
the user sneaks an extra burst. The hard OpenRouter account cap covers the
tail risk.

### 6.5.2 KV sketch

```ts
// wrangler.jsonc binds RATE_LIMIT_KV
export const runtime = "edge";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3; // tightened from 10 for public demo
const DAILY_LIMIT_MAX = 30;

async function checkRateLimit(env: { RATE_LIMIT_KV: KVNamespace }, ip: string) {
  const now = Date.now();
  const key = `rate:${ip}`;
  const raw = await env.RATE_LIMIT_KV.get(key);
  const hits: number[] = raw ? JSON.parse(raw) : [];
  const fresh = hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX) return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS };
  fresh.push(now);
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(fresh), {
    expirationTtl: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  });
  // Daily cap with a separate key, same pattern, expirationTtl: 86400.
  return { limited: false };
}
```

Bindings declared in `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    { "binding": "RATE_LIMIT_KV", "id": "<created-with-wrangler>" }
  ]
}
```

Create the KV namespace once: `npx wrangler kv namespace create RATE_LIMIT`.
Add the returned ID to `wrangler.jsonc`.

### 6.5.3 Why this matters more than any other phase

Of everything in this document, **this is the one item where skipping the
work makes the production deploy strictly worse than not deploying**. A
broken rate limiter combined with an OpenRouter key in production is the
exact configuration that produces a five-figure bill from one bad actor on
one bad night. Land §6.5 before §7.

---

## 7. Phase 3 — Secrets and environment variables

Three surfaces to keep straight. Do not mix them.

### 7.1 Cloudflare Pages (the *runtime* env)

Set on the Pages project. These are what the live site reads at request time.

| Name | Production | Preview |
|---|---|---|
| `OPENROUTER_API_KEY` | prod-scoped key | preview-scoped key (lower limit) |
| `NEXT_PUBLIC_PARTYKIT_HOST` | `sketch2md.<user>.partykit.dev` | `sketch2md-preview.<user>.partykit.dev` (optional) |
| `NEXT_PUBLIC_APP_URL` | `https://sketch2md.<your-zone>` | `https://<commit>.sketch2md.pages.dev` |

### 7.2 GitHub Environment: `cloudflare-production`

Used by the deploy workflow. New environment to create alongside
`codex-ci-review` and `intent-review`.

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | scoped per §4.2; deploy job authenticates wrangler |
| `CLOUDFLARE_ACCOUNT_ID` | identifies the target account |
| `PARTYKIT_LOGIN` | PartyKit account email or username |
| `PARTYKIT_TOKEN` | PartyKit auth token from `npx partykit login` |

Protection rules:

- **Deployment branches:** Selected branches → `main` only (and tags
  `v*.*.*` if you adopt tag-based releases later)
- **Required reviewers:** KjellKod (yourself) — strongly recommended for a
  production deploy environment
- **Wait timer:** 0 (or 5 min if you want a cancellation window)

### 7.3 GitHub Actions secrets vs Environment secrets

Use **Environment secrets**, not repo-level Actions secrets, for everything in
§7.2. Environment secrets are only readable from jobs that declare
`environment: cloudflare-production`, which makes the trust boundary obvious.

---

## 8. Phase 4 — CI/CD wiring

### 8.1 New workflow: `.github/workflows/deploy-cloudflare.yml`

Triggers:

- `push` to `main` → production deploy
- `pull_request` opened/synchronized → preview deploy (gated, see below)

Trust posture mirrors `codex-ci-review.yml`:

- Same-repo head only
- Trusted-author gate (`KjellKod`)
- Environment gate (`cloudflare-production`)
- Helpers from base ref, not PR HEAD
- `--ignore-scripts` everywhere
- All third-party actions pinned to commit SHAs with `# vX.Y.Z` comments

Sketch of the job structure:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write  # to comment preview URLs back on PRs
  deployments: write     # so the deploy shows up in the GH UI

concurrency:
  group: cf-deploy-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    name: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>  # v6.0.2
        with:
          ref: ${{ github.event.pull_request.base.sha || github.sha }}
      - uses: actions/setup-node@<sha>  # v6.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci --ignore-scripts
      - run: npm run build:cf
      - uses: actions/upload-artifact@<sha>  # v7.0.1
        with:
          name: opennext-bundle
          path: .open-next
          retention-days: 7

  deploy-cloudflare:
    name: deploy-cloudflare
    needs: build
    runs-on: ubuntu-latest
    environment: cloudflare-production
    timeout-minutes: 10
    if: >-
      github.event.pull_request == null ||
      (github.event.pull_request.head.repo.full_name == github.repository &&
       github.event.pull_request.user.login == 'KjellKod')
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/download-artifact@<sha>
        with:
          name: opennext-bundle
          path: .open-next
      - name: Deploy Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          npx --yes wrangler@<pinned> pages deploy .open-next \
            --project-name sketch2md \
            --branch "${{ github.event.pull_request.head.ref || github.ref_name }}"
      - name: Deploy PartyKit (production only)
        if: github.event_name == 'push'
        env:
          PARTYKIT_LOGIN: ${{ secrets.PARTYKIT_LOGIN }}
          PARTYKIT_TOKEN: ${{ secrets.PARTYKIT_TOKEN }}
        run: |
          npx --yes partykit@<pinned> deploy --name sketch2md
```

### 8.2 wrangler version pinning

Same model as Codex CLI: store a pinned version + tarball SHA-512 in
`.github/wrangler-version.txt` + `.github/wrangler-integrity.txt`, and have the
deploy step download-verify-install before invoking. The `codex-version-drift`
workflow gets a sibling: `wrangler-version-drift.yml` running the same weekly
cron.

If that feels like too much for wrangler specifically, an acceptable middle
ground is `npx wrangler@<exact-version>` from npm directly without integrity
verification, on the rationale that wrangler is Cloudflare's first-party tool
and the supply-chain blast radius is your CF account. Pin choices in
descending order of paranoia:

1. **Full integrity-verified** (matches Codex CLI): tarball download +
   SHA-512 check + `npm install -g --ignore-scripts <tgz>`. Highest security.
2. **Exact version, registry trust**: `npx wrangler@4.42.0 …`. Cloudflare's
   own tool; acceptable.
3. **`npx wrangler …`**: floats to latest. Do not pick.

I would default to **(1)** for production, **(2)** for preview deploys if you
want lower friction.

### 8.3 Preview deploy comment on PRs

Optional but high value. After `wrangler pages deploy --branch <ref>`, CF
returns a preview URL. Post it back as a PR comment using `gh pr comment`.
Already authored as a small Python helper or 5-line `gh` invocation.

### 8.4 Dependabot scope update

`.github/dependabot.yml` already covers `github-actions` and `npm`. The
deploy workflow uses both, so no changes needed. The wrangler version pin
lives outside `package.json` (like Codex), so its drift gets its own weekly
workflow — same pattern.

---

## 9. Phase 5 — Custom domain (optional)

If `sketch2md.pages.dev` is fine for v1, skip this section.

To attach a custom domain:

1. Move (or create) the zone in Cloudflare DNS for the apex domain.
2. In CF Pages → sketch2md project → **Custom domains** → add `sketch2md.<your-zone>`.
3. CF creates the DNS record automatically when the zone is CF-managed.
4. Update `NEXT_PUBLIC_APP_URL` in Pages env to the custom URL.
5. Update `src/app/sitemap.ts` if it hardcodes the host.

PartyKit custom domain works similarly but requires the custom Workers deploy
path (§6.1 option B). Hosted PartyKit gives you `<name>.<user>.partykit.dev`
permanently — fine for v1.

---

## 10. Phase 6 — GitHub Pages static demo (optional, parallel)

Independent from the Cloudflare deploy. Publishes a stripped-down build at
`kjellkod.github.io/sketch2md` for a marketing-friendly URL.

- Add a `NEXT_PUBLIC_DEMO_MODE=1` env that hides the AI button and disables
  PartyKit hookup at the client layer.
- Author a separate build entry: `npm run build:demo` that runs Next.js with
  `output: "export"` and `NEXT_PUBLIC_DEMO_MODE=1`.
- New workflow `deploy-pages.yml` — adapt doc2md's, replace the Vite-specific
  bits, run the demo build, upload the static `out/` directory as a Pages
  artifact, deploy via `actions/deploy-pages@v5` (also SHA-pinned).
- Gate: only on tag push matching `v*.*.*` if you want release-tied demos,
  otherwise on `main` push.

This is fully optional. Recommend pushing it to a later iteration once the CF
deploy is live and reliable.

---

## 11. Phase 7 — Future data persistence (out of scope, but plan for it)

When you eventually want server-side saved sketches:

| Need | Cloudflare service |
|---|---|
| Save/load named sketches per user | **D1** (SQLite) or **KV** (key-value) |
| Share a sketch via URL | **R2** (object storage) for the serialized scene + KV for the short-link |
| Real-time collaborative state durability | PartyKit `room.storage` (already there, just unused) or D1 |
| Asset uploads (e.g., reference images) | **R2** |

All four bind directly to the Pages function via `wrangler.toml`. No
infrastructure-as-code work. Free tiers cover hobby usage.

---

## 12. Security considerations

1. **API token scoping.** `CLOUDFLARE_API_TOKEN` should have only Pages:Edit
   and Workers Scripts:Edit (plus Account Settings:Read). Do not use the global
   "All zones, all permissions" token. If the token leaks, the blast radius is
   sketch2md only.
2. **Two OpenAI keys.** Production and preview Pages environments should hold
   different `OPENROUTER_API_KEY` values, with the preview key on a tight monthly
   limit. Prompt-injection in a draft PR (where Codex review and CF preview
   both fire) cannot drain the prod budget.
3. **PartyKit token scope.** PartyKit tokens are account-scoped. Prefer a
   dedicated CI account or a token labeled for CI use. Rotation: yearly minimum.
4. **No client-readable secrets.** Every `NEXT_PUBLIC_*` var ships to the
   browser. Audit the env list before adding new vars to that prefix.
5. **`compatibility_flags = ["nodejs_compat"]`.** This expands the API surface
   available to the worker, which is necessary for `@ai-sdk/openai` but also
   widens the attack surface. Acceptable trade-off, but review if Cloudflare
   patches a `nodejs_compat` boundary later.
6. **Helper scripts from base ref.** The deploy workflow must follow the same
   rule as `codex-ci-review.yml`: anything executed with the CF API token in
   scope must come from the PR base ref, never the PR HEAD. Add a guard to
   `scripts/security_ci_guard.py` for the `cloudflare-production` environment
   the same way `OPENROUTER_API_KEY` is guarded.
7. **`pages-action` is deprecated.** Use direct wrangler invocation. Several
   public guides still reference `cloudflare/pages-action@v1` — that action is
   archived. Don't add it to dependabot bait.

---

## 13. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Edge runtime incompatibility in a new dep | medium | high (deploy fails) | Pin `@opennextjs/cloudflare` with a version-drift workflow; run `npm run build:cf` in CI on every PR before merge |
| OpenAI cost runaway from misuse | low | medium | Per-key spend caps; separate preview key with a $5/mo lid |
| PartyKit free tier overrun | low | low | CF Workers free tier is generous; if hit, custom Workers deploy bypasses PartyKit quota |
| wrangler upgrade breaks deploy | medium | medium | Version pin + drift workflow |
| Custom domain DNS misconfig | low | high (site down) | Stage the custom domain swap with a TTL of 60s and a rollback plan |
| Pages build minute exhaustion | low | low (delays) | We build in GH Actions, not CF builders — not an issue with our chosen approach |

---

## 14. Costs

All free tiers as of late 2026; verify at deploy time.

| Service | Free tier | When you pay |
|---|---|---|
| Cloudflare Pages | 500 builds/month, unlimited requests | Almost never for a hobby app |
| Cloudflare Workers (PartyKit) | 100k requests/day, 10ms CPU per request | Heavy active collab usage |
| OpenAI API | none — pay per token | every AI generate call |
| GitHub Actions | 2000 min/month private repos, unlimited public | Long-running CF builds (we do them on Actions, so this counts) |
| Domain registration | varies ($10–15/yr) | You buy the TLD elsewhere |

Realistic cost for a personal-scale sketch2md: **OpenAI tokens are the only
non-zero line.** Cap your monthly spend at $5–10/mo via the OpenAI dashboard.

---

## 15. Open questions

1. **Custom domain?** If yes, which subdomain? (`sketch2md.kjellkod.dev`?)
2. **Hosted PartyKit or custom Workers?** Recommendation: hosted for v1.
3. **Preview deploys on every PR, or only on `KjellKod`-authored PRs?**
   Strict mode mirrors the Codex review gate.
4. **PR comment with preview URL?** Useful, low effort. Default: yes.
5. **`output: "export"` demo on GitHub Pages — needed?** Default: defer.
6. **Wrangler pinning strictness?** Default: integrity-verified for prod.
7. **Sentry / error tracking?** Out of scope; Cloudflare Logs are enough for v1.
8. **`@opennextjs/cloudflare` vs older `next-on-pages` adapter** — confirm
   OpenNext is the right choice the day we wire this. Cloudflare may have
   shifted recommendations.

---

## 16. Step-by-step execution checklist

Once you give the go-ahead, the work is roughly:

### Day 1 — local prep
- [ ] Verify `/api/generate/route.ts` exports `runtime = "edge"`.
- [ ] Add `@opennextjs/cloudflare` to devDependencies (pinned).
- [ ] Add `wrangler.jsonc` with `nodejs_compat` and target compatibility date.
- [ ] Run `npm run build:cf` locally; fix any edge-incompat warnings.
- [ ] Run `npx opennextjs-cloudflare preview` locally; verify the editor + AI route work.

### Day 1 — Cloudflare setup
- [ ] Create CF account if missing; verify email; enable 2FA.
- [ ] Create CF API token with minimum scopes.
- [ ] Note account ID.
- [ ] Create Pages project `sketch2md` (direct upload, not git integration).
- [ ] Set `OPENROUTER_API_KEY` (prod + preview), `NEXT_PUBLIC_PARTYKIT_HOST`.

### Day 1 — PartyKit setup
- [ ] `npx partykit login`.
- [ ] `npx partykit deploy --name sketch2md` from local.
- [ ] Verify connection from a running `next dev` against the deployed party.

### Day 2 — CI wiring
- [ ] Author `.github/workflows/deploy-cloudflare.yml`.
- [ ] Add `.github/wrangler-version.txt` + integrity file (mirroring Codex
      pattern).
- [ ] Add `wrangler-version-drift.yml` (sibling to `codex-version-drift.yml`).
- [ ] Update `scripts/security_ci_guard.py` to require environment gate +
      base-ref checkout for `CLOUDFLARE_API_TOKEN`.
- [ ] Add a unit test for the new guard rule.

### Day 2 — GitHub Environments
- [ ] Create `cloudflare-production` environment.
- [ ] Add secrets per §7.2.
- [ ] Protection: `main` only, KjellKod reviewer.
- [ ] Trigger a deploy by pushing a small change to `main`.
- [ ] Verify the live URL serves the editor and `/api/generate` streams.

### Day 3 — polish
- [ ] PR preview comment on first PR.
- [ ] Custom domain (if §9 chosen).
- [ ] README badge linking to live site.
- [ ] Diary entry per repo convention.

---

## 17. References

- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- OpenNext for Cloudflare: https://opennext.js.org/cloudflare
- PartyKit docs: https://docs.partykit.io/
- `@opennextjs/cloudflare` repo: https://github.com/opennextjs/opennextjs-cloudflare
- Wrangler GitHub Action: https://github.com/cloudflare/wrangler-action
- This repo's CI trust model: see `scripts/security_ci_guard.py`,
  `.github/workflows/codex-ci-review.yml`, and the prior security analysis
  in chat history.

---

## 18. What I need from you to proceed

When you're ready to go, answer the open questions in §15 and tell me which
phase to start with. The minimum-viable path is:

1. Cloudflare API token + account ID (you create + share securely).
2. PartyKit account ready (`npx partykit login` done locally).
3. Decision on custom domain.
4. Decision on wrangler pinning strictness.

I'll then author the `deploy-cloudflare.yml`, the wrangler pin files, the
guard update, and the matching unit test — same trust posture as the rest of
the CI.

— Jean-Claude
