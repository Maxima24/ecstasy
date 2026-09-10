# Ecstacy Frontend Plan

Single source of truth for the frontend build. Written to be executed by a
coding agent as well as read by a person.

- **Product:** Ecstacy — adaptive GRE/GMAT quantitative reasoning, mobile only
- **Event:** Prometheus Fall Classic, submission **2026-09-26**
- **PRD:** Frontend PRD v0.2, owner Faith Popoola
- **Stack decision:** [ADR-0001](../docs/decisions/0001-frontend-stack-nextjs.md)
- **Repo rules:** [RULES.md](../RULES.md) · [AGENTS.md](../AGENTS.md) · [frontend/AGENTS.md](AGENTS.md)

---

## Contents

1. [Rules that must not break](#1-rules-that-must-not-break)
2. [What exists today](#2-what-exists-today)
3. [What is decided vs still open](#3-what-is-decided-vs-still-open)
4. [Backend contract](#4-backend-contract)
5. [File layout](#5-file-layout)
6. [The proxy](#6-the-proxy)
7. [Profile invariants](#7-profile-invariants)
8. [Block registry and renderer](#8-block-registry-and-renderer)
9. [Data layer and caching](#9-data-layer-and-caching)
10. [Typography](#10-typography)
11. [Token layer](#11-token-layer)
12. [Math rendering](#12-math-rendering)
13. [Motion](#13-motion)
14. [Layout and responsiveness](#14-layout-and-responsiveness)
15. [Failure states](#15-failure-states)
16. [Performance budgets](#16-performance-budgets)
17. [Build order](#17-build-order)
18. [Definition of done](#18-definition-of-done)
19. [Cross-team dependencies](#19-cross-team-dependencies)
20. [Working agreement](#20-working-agreement)

---

## 1. Rules that must not break

These are not preferences. A change that violates one of these is a defect
regardless of what else it achieves.

| # | Rule | Why |
|---|---|---|
| R1 | Server code in `frontend/` is a **proxy, never an implementation**. No domain logic, no authorization decisions, no database/cache/queue/object-store connection. | [ADR-0001](../docs/decisions/0001-frontend-stack-nextjs.md). The backend is the authorization boundary. |
| R2 | The proxy caches **nothing**. Every route sets `cache: 'no-store'`. | `roadmap` and `progress_panel` arrive filled per user. A cached proxy response served to a second user is a cross-user data leak, not a stale-data bug. |
| R3 | `dangerouslySetInnerHTML` appears **exactly once**, on KaTeX output. Never on model output. | Model output is untrusted. |
| R4 | No secret in any `NEXT_PUBLIC_*` variable. The bearer token lives in `API_TOKEN`, server-side only, and never enters the browser bundle. | `NEXT_PUBLIC_*` is inlined into client JS and is public by definition. |
| R5 | Backend status codes pass through untouched, including 401 and 403. | Reinterpreting them moves an authorization decision into the frontend. |
| R6 | All work stays under `frontend/`, on `frontend` or a `feat/frontend/<issue>-<slug>` branch. | [RULES.md](../RULES.md) §3–4, machine-checked by `scripts/Test-Policy.Tests.ps1`. |
| R7 | Animate `transform` and `opacity` only. | Anything touching layout during the flip puts the sub-400 ms budget at the mercy of a reflow. |
| R8 | No animation waits on the network. | Every transition runs against data already in the cache. |
| R9 | Profile invariants are applied **after parsing, before render** — never inside a component. | Components stay profile-unaware. The clamp is what makes the demo safe. |
| R10 | Fixtures are a development scaffold, never a specification. | A fixture is not the source of truth for an interface. |

Before opening a PR:

```bash
cd frontend && npm run build && npm run typecheck && npm run lint
cd .. && powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Policy.Tests.ps1
```

---

## 2. What exists today

Scaffolded and on the `frontend` branch. Build, typecheck and lint are clean.

| Path | State | Notes |
|---|---|---|
| `frontend/` | Done | Next 16.3.4, React 19.2.8, TypeScript, Tailwind 4, App Router, `src/`, `@/*` alias, ESLint, Turbopack |
| `src/lib/env.ts` | Done | `server-only`, validated env access |
| `src/lib/backend.ts` | **Needs rework** | Currently forwards cookies. Must attach `Authorization: Bearer ${API_TOKEN}` instead — see §6 |
| `src/lib/fixtures/index.ts` | **Placeholder** | Holds a `GET /health` stub. Must be replaced with PRD-shaped block fixtures per profile |
| `src/app/api/health/route.ts` | Done | Reference proxy route, verified against fixture / live / unreachable |
| `src/lib/query/client.ts` | Done, timings provisional | SSR-safe QueryClient. `staleTime` must change per §9 |
| `src/lib/query/provider.tsx` | Done | Provider + devtools, mounted in root layout |
| `src/app/layout.tsx` | Partial | Still Geist fonts and `Create Next App` metadata. Replace per §10 |

Installed: `@tanstack/react-query@5.102.8`, `@tanstack/react-query-devtools`, `server-only`.

Not yet installed: `katex`, `framer-motion` (or a CSS-only equivalent — see §13).

---

## 3. What is decided vs still open

### Decided

- Next.js with a BFF proxy, bearer token server-side ([ADR-0001](../docs/decisions/0001-frontend-stack-nextjs.md))
- TanStack Query as the client data layer
- IBM Plex Sans + IBM Plex Mono, one family differentiated by setting
- KaTeX for math
- Four durations, two curves (IBM Carbon motion) — §13
- 375px only; no desktop, no dark mode

### Open — needs decision before or during Day 5

| Question | Impact | Default if undecided |
|---|---|---|
| ~~Colour system~~ | Settled | See `src/styles/tokens.css`. Four per-profile accents confined to rail, chip, `next` row and controls |
| ~~Spacing scale~~ | Settled | 4px base plus a fixed 28px `--block-gap` |
| **Component surface treatment** | Whether blocks read as cards, panels, or bare sections | Bare sections with hairline separators; card treatment reserved for the block that needs emphasis |
| **`framer-motion` vs CSS transitions** | ~34 KB against a 200 KB budget | CSS transitions + FLIP; adopt `framer-motion` only if `AnimatePresence` exit choreography proves necessary |
| **Empty/first-run state** | §9 of the PRD says the judge lands in a seeded account with partial mastery, so this may never render | Skip until Day 7 |

> **The "clean UI" research is not done.** The PRD and typeface research cover
> type, structure and motion. They do not cover colour, spacing rhythm, or
> component surface treatment. Treat the defaults above as placeholders and
> replace them when that research lands — do not harden them into a design
> system in the meantime.

---

## 4. Backend contract

All endpoints return JSON. Base URL is `BACKEND_URL`, **server-side only**.

> The PRD specifies `VITE_API_URL` and `localhost:5173`. Those are superseded by
> the Next.js decision. The browser never learns the backend URL or the token.

### `POST /ask` — primary

```json
{ "user_id": "demo", "profile": "rusty", "question": "If 3x + 5 = 20, what is x?" }
```

```json
{ "spec_id": "a3f9c2...", "cached": true, "blocks": [ /* 1 to 5 Block objects */ ] }
```

- `cached` is dev-overlay only, never shown to learners.
- On generation failure after one retry the backend returns a single
  `explainer_card` fallback with **HTTP 200**. A model failure is not a server
  failure. A degraded screen beats an error screen.
- `roadmap` and `progress_panel` arrive **already filled** from Postgres. The
  frontend must never receive mastery numbers that came from the model.
- Maths arrives as TeX in dedicated `expr` fields, marked at ingestion. The
  frontend does **not** pattern-match expressions out of prose.

### `POST /quiz/submit`

```json
{ "user_id": "demo", "question_id": "aqua_48213", "topic_id": "rates",
  "selected_index": 1, "elapsed_ms": 14200 }
```

```json
{ "correct": false, "answer_index": 2,
  "mastery": { "topic_id": "rates", "before": 0.31, "after": 0.26 },
  "roadmap_changed": true }
```

`roadmap_changed` decides whether to invalidate the roadmap and progress
queries. It exists so the frontend does **not** refetch on every answer.

### `GET /roadmap?user_id=demo`

Same shape as the filled `roadmap` block. Used for refetch after a quiz, not on
initial load — the block already carries it.

### `POST /profile`

```json
{ "user_id": "demo", "profile": "hands_free" }
```

Returns 204. The frontend flips optimistically and does not await it.

### Error contract

```json
{ "error": { "code": "retrieval_failed", "message": "...", "retryable": true } }
```

4xx for client errors, 5xx only for genuine server failure.

### Block schema

Six types. `type` is a literal discriminant on every one.

```ts
export type Profile = 'rusty' | 'time_poor' | 'hands_free' | 'strong';

export type Citation = { chunk_id: string; label: string };

export type ExplainerCard = {
  type: 'explainer_card';
  title: string;
  steps: Array<{ text: string; expr?: string | null }>;  // 2–5
  citation?: Citation | null;
};

export type AudioExplainer = {
  type: 'audio_explainer';
  script: string;
  audio_url: string;
  duration_ms: number;
  transcript_shown: boolean;
};

export type QuizQuestion = {
  id: string;
  stem: string;
  stem_expr: string | null;
  options: string[];          // five
  topic_id: string;
  answer_index: number;       // shipped up front: grading is instant
  rationale: string;
};

export type Quiz = {
  type: 'quiz';
  timer_seconds: number | null;   // non-null only for `strong`
  questions: QuizQuestion[];
};

export type RoadmapStep = {
  topic_id: string;
  label: string;
  mastery: number;                 // 0..1
  status: 'next' | 'done' | 'later';
};

export type Roadmap = { type: 'roadmap'; steps: RoadmapStep[] };  // exactly one `next`

export type Flashcards = {
  type: 'flashcards';
  cards: Array<{ front: string; back: string; topic_id: string }>;
};

export type ProgressPanel = {
  type: 'progress_panel';
  weakest_topics: Array<{ topic_id: string; label: string; mastery: number }>;  // exactly 3
  streak: number;
  next_action_label: string;
};

export type Block =
  | ExplainerCard | AudioExplainer | Quiz
  | Roadmap | Flashcards | ProgressPanel;
```

`explainer_card.steps` is an array, **not** a prose body. The segmented
presentation the `rusty` profile depends on requires it.

### Latency budgets

| Path | Budget | Note |
|---|---|---|
| `/ask` cached | 150 ms | The demo path must always be cached |
| `/ask` uncached | 2500 ms | Skeleton, never a spinner |
| `/quiz/submit` | 300 ms | No model call in this path |
| `/profile` | fire and forget | Not awaited |

---

## 5. File layout

```
frontend/src/
  app/
    layout.tsx              root layout, fonts, QueryProvider
    page.tsx                the one screen
    dev/page.tsx            all four profiles side by side from fixtures
    api/
      ask/route.ts          POST -> backend /ask
      quiz/submit/route.ts  POST -> backend /quiz/submit
      roadmap/route.ts      GET  -> backend /roadmap
      profile/route.ts      POST -> backend /profile
      health/route.ts       reference route (exists)
  lib/
    env.ts                  server-only env access            (exists)
    backend.ts              single egress point               (needs rework, §6)
    api.ts                  client-side callers + mock flag
    invariants.ts           profile clamps                    (§7)
    types.ts                block schema                      (§4)
    query/
      client.ts             QueryClient                       (exists)
      provider.tsx          provider + devtools               (exists)
      keys.ts               query key factory                 (§9)
    fixtures/
      index.ts              one fixture set per profile       (replace placeholder)
  blocks/
    registry.ts             type -> component map             (§8)
    BlockRenderer.tsx       renderer + per-block boundary
    BlockBoundary.tsx
    FallbackCard.tsx
    ExplainerCard.tsx
    AudioExplainer.tsx
    Quiz.tsx
    Roadmap.tsx
    Flashcards.tsx
    ProgressPanel.tsx
  components/
    ui/                     shared primitives
    chrome/                 header, progress, ask input
  styles/
    tokens.css              data-profile custom properties    (§11)
```

---

## 6. The proxy

`src/lib/backend.ts` is the only module that talks to the backend. Nothing else
calls it directly.

Current implementation forwards browser cookies. **That is wrong for this
product** — §3.1 of the PRD specifies a static bearer token and `user_id` in the
body, with no session management. Rework it to:

```ts
import 'server-only';

const headers: Record<string, string> = {
  accept: 'application/json',
  authorization: `Bearer ${serverEnv.apiToken}`,   // never reaches the browser
  ...init.headers,
};
if (init.body !== undefined) headers['content-type'] = 'application/json';
```

Keep everything else already implemented and verified:

- Status passes through untouched, including 401/403 (**R5**)
- `cache: 'no-store'` on every call (**R2**)
- `AbortSignal.timeout(serverEnv.backendTimeoutMs)`
- Failures return a safe message plus an `x-proxy-reference` correlating to a
  server log line. Backend hostnames and stack traces never reach the browser.
- Every response carries `x-data-source: fixture | backend`

Environment variables — **names only**, never values:

```bash
BACKEND_URL=          # unset -> fixtures
API_TOKEN=            # bearer, server-side only
BACKEND_TIMEOUT_MS=   # default 5000
```

### Route handlers are forwarding addresses

```ts
// src/app/api/ask/route.ts
import { proxy } from '@/lib/backend';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  return proxy('POST', '/ask', { body });
}
```

No logic. If you are adding a rule here that decides *whether* something is
allowed, it belongs in the backend and in `contracts/`.

---

## 7. Profile invariants

Applied after parsing, before render. The model chooses within the constraint;
code guarantees the shape.

```ts
// src/lib/invariants.ts
export const INVARIANTS: Record<Profile, (b: Block[]) => Block[]> = {
  rusty:      b => b.slice(0, 1),
  time_poor:  b => [roadmapFirst(b), ...b.filter(x => x.type !== 'roadmap')],
  hands_free: b => hasAudio(b) ? b : [toAudio(b[0]), ...b.slice(1)],
  strong:     b => b.filter(x => x.type !== 'explainer_card'),
};
```

| Profile | Opens with | Never shows | Clamp |
|---|---|---|---|
| `rusty` | Segmented worked example | More than one block | `slice(0, 1)` |
| `time_poor` | Roadmap, next step highlighted | Long body text | Roadmap hoisted first |
| `hands_free` | Audio control | Transcript by default | Audio guaranteed present |
| `strong` | Timed drill | Any explainer card | `explainer_card` filtered out |

This is load-bearing. It makes the cognitive-load argument true in the product
rather than only in the pitch, and it makes the demo safe regardless of what the
model returns. Guard the edges: `roadmapFirst` on a block array with no roadmap,
and `toAudio` on an empty array, must both be total functions.

---

## 8. Block registry and renderer

```tsx
const REGISTRY = {
  explainer_card: ExplainerCard, audio_explainer: AudioExplainer,
  quiz: Quiz, roadmap: Roadmap, flashcards: Flashcards,
  progress_panel: ProgressPanel,
} as const;

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => {
    const C = REGISTRY[b.type];
    if (!C) return null;                       // unknown type: skip, never throw
    return (
      <BlockBoundary key={i} fallback={<FallbackCard />}>
        <C {...(b as never)} />
      </BlockBoundary>
    );
  });
}
```

- Unknown type returns `null` rather than throwing.
- Error boundary is **per block, not per page**. One bad block must not take the
  screen with it.
- The frontend re-validates block shape defensively even though the backend has
  already validated against the Pydantic schema.
- No component branches on profile. Profile reaches components only through CSS
  custom properties (§11).

---

## 9. Data layer and caching

One React context for `profile` and `userId`. **No Redux, no Zustand.**

### Query keys

```ts
export const keys = {
  ask:      (question: string, profile: Profile) => ['ask', question, profile] as const,
  roadmap:  (userId: string) => ['roadmap', userId] as const,
  progress: (userId: string) => ['progress', userId] as const,
};
```

### Cache policy

| Key | staleTime | Invalidated by |
|---|---|---|
| `['ask', question, profile]` | `Infinity` | Nothing. Specs are deterministic and pre-warmed. |
| `['roadmap', userId]` | `0` | `roadmap_changed: true` only |
| `['progress', userId]` | `0` | `roadmap_changed: true` only |

`staleTime: Infinity` on the ask key is what makes the profile flip instant. A
spec for a given question and profile does not change within a session.
Refetching it trades the demo's best moment for nothing.

> `src/lib/query/client.ts` currently ships `staleTime: 30_000` as a provisional
> default. Override per-key rather than changing the global default, so future
> queries do not silently inherit `Infinity`.

### Prefetch — this is what makes the proxy affordable

The proxy adds a network hop against a 150 ms cached budget. Prefetching all
four profile keys on mount confines that hop to initial load, where the budget
is 2500 ms.

```ts
// after the first /ask resolves
PROFILES.forEach(p => {
  queryClient.prefetchQuery({
    queryKey: keys.ask(question, p),
    queryFn: () => askApi(question, p),
    staleTime: Infinity,
  });
});
```

Every flip after that is a cache read at zero network latency.

### Other rules

- A profile flip during an in-flight request must never render the stale
  response. Correct keying makes Query discard it — do not hand-roll
  cancellation.
- `refetchOnWindowFocus: false`. A judge tabbing away and back must not trigger
  a round trip mid-demo.
- Retry skips 4xx; the proxy returns final, safe errors.
- Quiz grading is local: `answer_index` ships with the block, so correctness
  renders on tap with no request in the path. The `/quiz/submit` call still goes
  out to record mastery, but the learner never waits on it.
- `POST /profile` is fire-and-forget. Flip optimistically.

### Fixtures first

`src/lib/api.ts` reads a mock flag and returns one fixture set per profile with
a **600 ms delay**. Build every loading and skeleton state against that delay.
Wire the real API on Day 8.

Hand the fixtures to whoever writes the system prompt — they are the clearest
contract between the two halves of the build.

---

## 10. Typography

One family, four settings. Profiles differ by **setting, never by typeface**.
The research is unambiguous: serif-versus-sans is a non-effect, and the
variables that move reading performance — size, line-height, measure, spacing —
are all reachable from CSS.

- **IBM Plex Sans** — body and UI
- **IBM Plex Mono** — answer options and worked-solution steps, with
  `tabular-nums` and slashed zero

### Per-profile settings at 375px

| Profile | Size | Line-height | Measure | Tracking |
|---|---|---|---|---|
| `rusty` | 19px | 1.6 | 32ch | 0 |
| `time_poor` | 16px | 1.45 | 40ch | 0 |
| `hands_free` | 15px | 1.6 | 38ch | +0.01em |
| `strong` | 15px | 1.4 | 45ch | 0 |

Bind these to the PRD table. The typeface research gives slightly wider ranges
(`rusty` 19–20px / 30–34ch, `strong` 15–16px); treat the PRD values as the
default and the ranges as the room available if a real phone review says so.

### Loading

`next/font` self-hosts at build time, subsets to Latin, and generates a
`size-adjust` fallback automatically — most of the CLS budget handled without
hand-written `@font-face` metrics. This is the concrete payoff of staying on
Next.js.

```ts
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';

export const plexSans = IBM_Plex_Sans({
  subsets: ['latin'], weight: ['400', '500', '600'],
  variable: '--font-sans', display: 'swap',
});

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'], weight: ['400', '500', '600'],
  variable: '--font-mono', display: 'swap',
});
```

Numerals: enable `tabular-nums` and the slashed zero on all numeric UI.

```css
.numeric {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums slashed-zero;
  font-feature-settings: "zero" 1;   /* Plex does not slash zero by default */
}
```

Also replace the `Create Next App` metadata in `layout.tsx`.

---

## 11. Token layer

Profile is a `data-profile` attribute on the render container. Components read
custom properties and stay profile-unaware.

```css
/* src/styles/tokens.css */
[data-profile] { --measure: 40ch; --step-gap: 12px; }

[data-profile="rusty"] {
  --body-size: 19px; --body-leading: 1.6;  --measure: 32ch;
  --tracking: 0;       --step-gap: 16px;
}
[data-profile="time_poor"] {
  --body-size: 16px; --body-leading: 1.45; --measure: 40ch;
  --tracking: 0;       --step-gap: 10px;
}
[data-profile="hands_free"] {
  --body-size: 15px; --body-leading: 1.6;  --measure: 38ch;
  --tracking: 0.01em;  --step-gap: 12px;
}
[data-profile="strong"] {
  --body-size: 15px; --body-leading: 1.4;  --measure: 45ch;
  --tracking: 0;       --step-gap: 8px;
}
```

If a component needs to know the profile, that is a design error — add a token
instead.

### Two constraints from design review

**Block separation does not compress.** `--block-gap` is fixed at 28px across
all four profiles. The rail is per-block, but at `strong` density (`--gap` 8px)
adjacent rails read as one continuous line and blocks visually concatenate — a
reader then cannot tell where one block ends or which block a control belongs
to. The mono block label is the second ownership cue and is **required on every
block**, not optional.

**The accent does not carry the flip.** A 2px hue change largely disappears in a
compressed phone recording. What makes the flip read as structural is the change
in block type, order and count, plus the density and type shift — the accent
only confirms which profile is selected. Do not weaken the invariant clamps (§7)
on the assumption that colour is doing the work.

---

## 12. Math rendering

KaTeX, on `expr` fields only. Expressions are marked during ingestion, so the
frontend never pattern-matches them out of prose.

```ts
katex.renderToString(expr, { throwOnError: false, displayMode: false })
```

- `throwOnError: false` — a bad expression degrades to its raw string, never to
  a blank card.
- Expressions never wrap mid-equation: `white-space: nowrap`, horizontal scroll
  on overflow, inside their own container so the page body never scrolls
  sideways.
- `.katex { font-size: 1em }` keeps expressions level with surrounding body text.
- Subset KaTeX fonts alongside the body fonts and count them against the 100 KB
  budget.
- KaTeX's CSS must be imported locally, not from a CDN.
- **R3 applies:** this is the one permitted `dangerouslySetInnerHTML`.

---

## 13. Motion

IBM Carbon motion curves, matching the IBM Plex type system. **Expressive** is
reserved for the profile flip — the one moment meant to be noticed. Everything a
finger touches uses **productive**, which gets out of the way.

```css
--ease-expressive-in:  cubic-bezier(0.4, 0.14, 0.3, 1);
--ease-expressive-out: cubic-bezier(0.4, 0.14, 1, 1);
--ease-productive-in:  cubic-bezier(0.2, 0, 0.38, 0.9);
--ease-productive-out: cubic-bezier(0.2, 0, 1, 0.9);
```

| Moment | Duration | Curve | Why |
|---|---|---|---|
| Profile flip, exit | 100 ms | `expressive-out` | Clears fast so the entrance owns the moment |
| Profile flip, enter | 250 ms | `expressive-in` | The screen rebuilding is the pitch |
| Roadmap reorder | 300 ms | `expressive-in` | Long enough to follow a row moving |
| Answer feedback | 70 ms | `productive-out` | Reads as instant, still not a hard cut |
| Everything else | 0 ms | — | Taps respond, they don't perform |

The profile flip: content fades out over 100 ms, then incoming blocks rise 8 px
into place over 250 ms. Chrome never moves.

The roadmap reorder uses FLIP — measure positions, repaint, animate the delta —
so the eye follows a topic moving rather than a list blinking into a different
order. It fires **only** on `roadmap_changed: true`.

### Restraint is the design

The PRD allows exactly one orchestrated moment. The failure mode is not too
little motion — it is animating cards in on every render, easing the ask bar,
sliding the chrome. Each is individually defensible and collectively fatal,
because the profile flip stops reading as special. If everything moves, nothing
is a reveal.

`prefers-reduced-motion` collapses every duration to 1 ms. The screen still
changes, it just does not travel.

---

## 14. Layout and responsiveness

**375px only.** Desktop layout, dark mode, settings, landing page and offline
mode are out of scope entirely. Do not add breakpoints, and do not add a
`prefers-color-scheme` block.

There is one screen. Its contents change.

```
┌─────────────────────────┐
│ profile pill   progress │  fixed chrome, never generated
├─────────────────────────┤
│                         │
│   BlockRenderer output  │  min-height locked
│                         │
├─────────────────────────┤
│ ask input               │  fixed
└─────────────────────────┘
```

Header, progress indicator and ask input are hand-built and identical across
every profile. Only the middle region is generated — this bounds how strange any
single generation can look.

The render container holds a `min-height` so the frame never collapses between a
one-block `rusty` screen and a four-row `strong` drill. Without it the flip
reads as a jump rather than a rebuild.

---

## 15. Failure states

None may reach a blank screen.

| Case | Behaviour |
|---|---|
| Unknown block type | Return null, render the rest |
| Block throws while rendering | Per-block boundary, fallback card in its place |
| Empty block array | Fallback card |
| Step text exceeds limit | CSS line clamp, "show more" control |
| `audio_url` missing or 404 | 3 s timeout, auto-reveal transcript with a quiet note |
| Request in flight during flip | Discard the stale response |
| Height changes between profiles | Container `min-height` holds the frame |
| Backend unreachable | Last cached response plus inline retry, never a full-page error |
| Expression fails to parse | KaTeX `throwOnError: false`, render the raw string |

Errors state what happened and what to do. **They do not apologise.**

### Dev route

`/dev` renders all four profiles side by side from fixtures, including
deliberately broken ones: five blocks for `rusty`, a 300-word step, an unknown
type, an empty array, a dead audio URL.

Twenty minutes to build, and it turns every row above into something visibly
fixed rather than something claimed.

---

## 16. Performance budgets

| Metric | Target | Verified by |
|---|---|---|
| Web fonts, total | ≤ 100 KB across 2–4 files — **see exception below** | Build output |
| LCP, 3G throttled | < 2.5 s | Lighthouse, simulated 3G |
| CLS | ≈ 0 | `size-adjust` fallback |
| Profile transition, warm cache | < 400 ms | Prefetched cache read |
| JS bundle, gzipped | < 200 KB | Excluding KaTeX |


### Accepted exception: KaTeX fonts

KaTeX ships 20 faces (~1.2 MB source, 576 KB bundled across 41 woff2 files with
IBM Plex), covering notation this product will never use — Fraktur, Script, AMS.
Subsetting to the faces GRE/GMAT algebra needs would bring it inside budget.

**Decision: keep the full set.** Any expression the backend produces will render,
including notation nobody anticipated, and browsers fetch only the faces a page
actually references — so the real per-visit cost is a fraction of the bundled
total.

This is a deliberate deviation, not an oversight. Lighthouse on Day 8 will flag
the font budget; that is expected. Do not subset the KaTeX fonts without asking
— the coverage is the point.

Verify with Lighthouse on **simulated 3G**, not on a desktop connection.

---

## 17. Build order

Fixtures first; real API on Day 8.

| Day | Deliverable |
|---|---|
| 3 | Types, fixtures, `lib/api.ts` with mock flag, `BlockRenderer` with boundaries, font subsetting |
| 4 | ExplainerCard (segmented), Quiz, Roadmap, ProgressPanel against fixtures |
| 5 | Profile context, invariant clamps, token layer, four `data-profile` blocks, dev route |
| 6 | Four profile treatments reviewed on a real phone, KaTeX wired |
| 7 | AudioExplainer with timeout, Flashcards, all failure states |
| 8 | Wire real API, deploy, confirm three demo keys are warm, Lighthouse on 3G |
| 9 | Buffer. Record the flip sequence and watch it back on a phone |

---

## 18. Definition of done

The final flow, end to end, nothing stubbed:

1. Judge opens the live URL and lands in the seeded account. No signup, no empty
   state, mastery already partial.
2. They type a quantitative question and get a grounded answer citing a syllabus
   section.
3. They tap the profile pill and switch to `rusty`. One card, one worked step, a
   single next control.
4. They switch to `hands_free`. Audio control takes the top of the screen,
   transcript collapsed. Same question, different screen.
5. They switch to `strong`. Explainer gone entirely, timed drill on screen. The
   reason is legible without narration.
6. They answer one question. It grades instantly, mastery updates, the roadmap
   reorders and the next topic moves to the top.
7. Nothing above waits more than 400 ms, because all three profile keys were
   pre-warmed.

If a step in that list needs explaining out loud to work, it is not done.

---

## 19. Cross-team dependencies

Frontend cannot close these. Raise them now, not on Day 8.

| Dependency | Owner | Risk if missed |
|---|---|---|
| CORS must allow the **Next.js origin**, not `localhost:5173` | Backend | Day 8 integration fails at the first request |
| `API_TOKEN` issued and shared out of band (never committed) | Backend | Proxy cannot authenticate |
| Three demo profile keys pre-warmed and seeded; live generation disabled by flag | Backend | The flip runs live generation at 2500 ms and the demo's best moment becomes its worst |
| `audio_url` ready-to-play by the time `/ask` responds | Backend | Frontend will not orchestrate a second TTS call in the render path |
| Product name settled — `Ectasy` (PRD) / `ecstasy` (repo) / `Ecstacy` (current) | Product | Ships with an inconsistent name |

---

## 20. Working agreement

Frontend is being built by more than one agent. To avoid collisions:

- **One issue, one branch, one outcome.** `feat/frontend/<issue>-<slug>`.
- Hackathon mode is open until **2026-09-26 23:59 WAT** ([RULES.md](../RULES.md)
  §10), so self-merge is permitted. Branch naming, path discipline and secret
  handling are **not** suspended.
- Run the four verification commands from §1 before every PR. Report exact
  commands and results — a failing or skipped check is reported as failing or
  skipped.
- Do not read the backend source tree. `contracts/` is the interface; until it
  exists, fixtures are.
- Changing anything in §1 requires updating this document in the same PR.
- If this plan and the PRD disagree, the PRD wins on product behaviour and this
  document wins on implementation. Surface the conflict rather than choosing
  silently.
