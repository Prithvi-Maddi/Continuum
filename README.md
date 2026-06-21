# Continuum

> **Grammarly catches grammar. Continuum catches broken canon.**

Continuum is a **live canon consistency engine for fictional worlds**. Writers load a story world, draft a new scene, and Continuum highlights every phrase that contradicts established canon — inline, with evidence quotes from the source and one-click verified fixes.

Built for the hackathon. Demoed on Game of Thrones.

---

## The Problem

Every long story is a giant pile of mutable state — who's alive, who has the sword, who's at war, who knows the secret. Writers track it in their heads and in static "story bibles" that rot the moment writing outpaces note-taking.

Existing tools fail in specific ways:

- **Generic AI writing assistants** generate more prose but have no persistent model of *your* world's state. They'll happily write a one-handed knight gripping with both gauntlets.
- **Story bibles / wikis** are passive — they require manual upkeep and never *check* new writing against themselves.
- **Beta readers / editors** catch continuity errors but are slow, expensive, and don't scale to live drafting.

Continuum's job: **turn existing material into structured canon, then actively check new writing against it** — with evidence, in real time, inside the editor.

---

## The Demo

The demo runs on a preloaded **Game of Thrones** world with 8 canonical facts. Paste this scene into the editor and hit **Check Continuity**:

> *"Jaime tightened the straps on both gauntlets before drawing his sword. He had ridden from Winterfell at first light and reached King's Landing by sunset. Over the capital, three dragons wheeled in formation — a sight every lord had grown up seeing. In the branch where Robb Stark survived the massacre at the Twins, his mother Catelyn was already dead in the great hall."*

**Four high-severity contradictions fire, each with canon evidence:**

| Phrase | Issue Type | Canon Violation |
|--------|-----------|-----------------|
| "both gauntlets" | `character_state` | Jaime lost his right hand after capture |
| "reached King's Landing by sunset" | `travel_time` | Winterfell → King's Landing takes weeks |
| "dragons wheeled … every lord had grown up seeing" | `world_rule` | No living dragons existed until Daenerys hatched hers |
| "Robb survived … Catelyn was already dead" | `branch` | In the Robb-lives branch, Catelyn also survived |

**Then the smart part:** flip the context chip to *Flashback — before Jaime's capture* and type `"Jaime caught the wine cup with both hands."` — **zero warnings.** The lost-hand fact isn't in force yet. The timeline visualization shows "you are here" before the event and greys out the fact. The model never even sees the conflicting fact — the time filtering happens in code before the LLM call.

---

## Architecture

### Three-Panel Editor

```
┌──────────────────────────────────────────────────────────────────┐
│  Continuum   [ Demo World: Game of Thrones ]    [Check Continuity]  │
├──────────────┬───────────────────────────────────┬───────────────┤
│  STORY BIBLE │  SCENE EDITOR                      │  ISSUES       │
│              │  Context: [Main timeline ○]         │               │
│  Characters  │                                    │  ● HIGH       │
│  Locations   │  Jaime tightened the straps on     │  char_state   │
│  World Rules │  ░both gauntlets░ before drawing   │               │
│  Timeline    │  his sword. He had ridden from     │  ● HIGH       │
│  ──●── here  │  Winterfell at first light and     │  travel_time  │
│  Branches    │  reached ░King's Landing by sunset░ │               │
│              │                                    │  [Apply fix ✓]│
└──────────────┴───────────────────────────────────┴───────────────┘
```

### The Engine Pipeline

Every continuity check runs a **2-call hot path** — not an agentic loop. Speed matters for a live editor.

```
1. extractClaims(sceneText)          ← Claude Haiku (fast)
   → Claim[] + inferredContext       (pre-fills context chips)

2. filterFacts(claims, position, branch)   ← pure TypeScript
   → only facts in force for this scene's time + branch

3. detectContradictions(claims, facts)     ← Claude Sonnet + extended thinking
   → ContinuityIssue[] with evidence, spans, suggested fixes

4. mapSpans(issues, sceneText)       ← indexOf + fuzzy fallback
   → character offsets for TipTap decorations
```

The time/branch filtering in step 2 is the key insight: **the model only ever sees facts that are actually in force for this scene's position.** This kills flashback false-positives without asking the model to reason about chronology.

### Two Real Agents

**Canon-builder agent** (`lib/agents/canonBuilder.ts`): a tool-using loop that converts raw canon text into structured entities, facts, events, and branches. Tools: `add_entity`, `add_fact`, `add_event`, `add_branch`, `search_existing_canon`. Self-reviews validity windows and branch tags before committing. Writes embeddings to Redis.

**Repair verify-loop agent** (`lib/agents/repairVerify.ts`): when you click Apply Fix, it patches the text, re-runs the hot-path check on the patched span, and only returns `verified: true` if the original contradiction is gone and no new high-severity issues appeared. Never applies an unverified patch on the demo path.

### Timeline & Branch Model

Every `CanonFact` has two nullable validity event IDs:

```ts
fact.validityStartEventId  // fact becomes true at this event
fact.validityEndEventId    // fact stops being true at this event (exclusive)
```

A scene's chronological position `p` (resolved from context chips) filters:

```ts
function isFactInForce(fact, p, events): boolean {
  const start = fact.validityStartEventId ? orderOf(start, events) : -Infinity;
  const end   = fact.validityEndEventId   ? orderOf(end, events)   : +Infinity;
  return p >= start && p < end;
}
```

Main timeline → `p = +∞` (every established fact applies). Flashback before event X → `p < order(X)`. The model never sees filtered-out facts — no temporal reasoning in the prompt, no false positives.

Branches are flat off `main`. Per-claim branch scoping fires when prose names a branch inline (e.g. *"in the branch where Robb survived"*) — the server resolves the branch name by substring match and filters facts for that claim's branch, making the GoT branch contradiction fire on the main timeline.

---

## Data Model

All engine primitives are domain-neutral. The fiction-ness lives in the seed data, prompts, and UI labels — not the schema.

```ts
Entity         // character, location, faction, object, event, rule
CanonFact      // text + factType + entityIds + sourceQuote + validity window + branchId
TimelineEvent  // id + name + order (integer, in-universe sequence)
Branch         // id + name + parentBranchId (flat off main for MVP)
Claim          // extracted assertion from scene text + sourceSpan + impliedBranchId
ContinuityIssue // issueType + severity + span + evidenceQuotes + suggestedFixes
SuggestedFix   // replacement text + preservesVoice + optional canonUpdate
```

Issue types: `world_rule` · `travel_time` · `character_state` · `object_state` · `relationship` · `faction_state` · `knowledge_state` · `timeline` · `branch`

Severity: `high` · `medium` · `low` — always phrased as "possible contradiction," never "error."

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Single repo; engine callable without HTTP |
| Editor | TipTap (ProseMirror) | Stable span decorations + programmatic text replace |
| State | Zustand | Flat, typesafe; issues + scene + selection in one store |
| AI | Anthropic Claude | Extended thinking on detection; structured tool-use outputs |
| Memory | Upstash Redis + Vector | Canon embeddings, agent scratchpad, check cache |
| Observability | Arize (OpenTelemetry) | Trace every AI step; shown before/after prompt improvement |
| Validation | Zod + zod-to-json-schema | Shared schema as both type and tool `input_schema` |
| Styling | Tailwind v4 | Dark editorial aesthetic — no chat bubbles |

---

## Sponsor Integrations

### Anthropic — the reasoning layer

Every AI call is structured, not freeform:

- **Claim extraction**: Haiku-class model returns `Claim[]` + `inferredContext` via `emit_claims` tool
- **Contradiction detection**: Sonnet/Opus with **extended thinking** returns `ContinuityIssue[]` via `emit_issues` tool — this is the product
- **Canon-builder agent**: mid/strong model with 5 tools; self-reviews before committing
- **Repair verify-loop agent**: fast model; proposes → patches → re-checks → confirms

The closing pitch angle: *"Same primitives power AI agent memory — facts that accumulate, branch, and contradict over long runs. We proved it on the hardest narrative case first."*

### Redis — story memory at scale

```
canon:fact:{id}              → fact JSON + embedding
canon:idx:{projectId}        → vector index for KNN retrieval
agent:canon:{sessionId}:*    → canon-builder working memory across tool turns
check:{hash(text+context)}   → cached check result (demo pre-warm)
ingest:{hash(text)}          → cached ingestion output (never cold-ingest on stage)
```

`search_existing_canon` in the canon-builder agent hits the Redis vector index to deduplicate facts as it builds. Same `FactRetriever` interface switches between in-memory (dev) and Redis vector search (ship) with no engine changes.

Pitch line: *"Claude reasons over structured state; Redis remembers the world."*

### Arize — observability-driven improvement

Every AI step emits a named OpenTelemetry span:

```
ai.claims.extract    → claims + inferredContext (fast model)
ai.context.infer     → nested span within extract
ai.issues.detect     → contradiction detection (+ extended thinking trace)
ai.repair.propose    → fix proposal
ai.repair.verify     → re-check pass/fail
ai.canon.builder     → agent loop (per tool call sub-span)
```

The demo shows a real before/after: Arize revealed over-flagging on the GoT draft → detection prompt tightened → improvement documented as `detect-v1.ts` → `detect-v2.ts`.

---

## Project Structure

```
continuum/
  app/
    page.tsx                      # three-panel shell
    api/
      check/route.ts              # POST — 2-call hot path (core)
      ingest/route.ts             # POST — canon-builder agent + file upload
      repair/route.ts             # POST — repair verify-loop
      project/route.ts            # GET — full canon
      canon/fact/route.ts         # POST — update canon from issue
      issue/[id]/route.ts         # PATCH — ignore / mark intentional
  components/
    panels/
      StoryBible.tsx              # left: entities, rules, timeline, branches
      SceneEditor.tsx             # center: TipTap + context chips
      IssuePanel.tsx              # right: cards, evidence, apply fix
  hooks/
    useContinuumStore.ts          # Zustand store
    useCheck.ts                   # /api/check call + cache
  lib/
    types.ts                      # all interfaces (Entity, CanonFact, ContinuityIssue…)
    engine/
      checkScene.ts               # pipeline orchestrator — no Next.js dependency
      resolveContext.ts           # SceneContext → resolvedPosition
      filterFacts.ts              # time validity + branch filter
      mapSpans.ts                 # model quotes → character offsets
    ai/
      models.ts                   # explicit model routing per task
      schemas.ts                  # Zod schemas (= tool input_schema)
      prompts/                    # extract, detect, fix, canon-builder templates
      tasks/
        extractClaims.ts
        detectContradictions.ts
        generateFixes.ts
    agents/
      canonBuilder.ts             # ingestion agent
      repairVerify.ts             # fix verify-loop agent
    store/
      memoryStore.ts              # in-memory (dev fallback)
    telemetry/                    # Arize / OpenTelemetry export
  seed/
    world.ts                      # GoT primary (8 facts, typed, stable IDs)
    world-moonstone.ts            # zero-IP fallback (The Moonstone Saga)
```

The engine (`lib/engine/checkScene.ts`) has no Next.js dependency. The HTTP handler is a thin adapter. A browser extension or Google Docs add-on calls the same `/api/check` endpoint and gets back `ContinuityIssue[]` — no engine changes.

---

## Running Locally

```bash
# Install
npm install

# Set env vars
cp .env.example .env.local
# ANTHROPIC_API_KEY=...
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
# UPSTASH_VECTOR_REST_URL=...
# UPSTASH_VECTOR_REST_TOKEN=...
# OPENAI_API_KEY=...         (for text-embedding-3-small)
# ARIZE_SPACE_ID=...
# ARIZE_API_KEY=...

# Dev (in-memory fallback works with only ANTHROPIC_API_KEY)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The GoT demo world loads on first render. Hit **Check Continuity** on the preloaded contradictory draft.

---

## The Canon

The GoT seed ships 8 canonical facts with stable IDs. All scene prose is original — no copyrighted text reproduced.

| Fact | Type | Validity |
|------|------|----------|
| Jaime lost his right sword hand after capture | `character_state` | from `evt_jaime_captured` |
| Ned Stark was executed at King's Landing | `character_state` | from `evt_ned_executed` |
| No living dragons existed in the known world | `world_rule` | until `evt_dragons_hatched` |
| Daenerys's dragons are the first in a generation; no lord grew up knowing them | `world_rule` | from `evt_dragons_hatched` |
| Winterfell → King's Landing takes weeks of hard riding | `world_rule` | always |
| (Branch A) Robb Stark survived the massacre at the Twins | `branch_state` | `branch_robb_lives` |
| (Branch A) Catelyn Stark also survived the Twins | `branch_state` | `branch_robb_lives` |
| (Branch B / canon) Robb and Catelyn were killed at the Red Wedding | `branch_state` | `branch_canon` |

Timeline event order: `evt_ned_executed` → `evt_jaime_captured` → `evt_red_wedding` → `evt_dragons_hatched`

A zero-IP fallback world (**The Moonstone Saga**) ships in `seed/world-moonstone.ts` for local testing without pop-culture baggage.

---

## The Closing Beat

> Long-running AI agents are story engines without a story bible. They accumulate facts, contradict themselves, and never cite sources. Continuum is state management for narratives — and the consistency layer agent builders need.
>
> Same primitives: `Entity · CanonFact · Claim · Branch · ContinuityIssue`. Same engine. Different seed data and prompts. We proved it on Westeros first.

---

## Build Milestones

The build was sequenced so every milestone produces a demoable artifact:

```
M0  — Skeleton (three panels, types, seed data)
M1  — Fully-faked clickable demo (permanent fallback)
M2  — Real editor + TipTap decorations
M3  — Real 2-call check endpoint
M4  — JSON hardening + Arize tracing + demo cache
M5  — Hybrid context chips + branch + time filtering
M6  — Story bible polish
M7  — Canon ingestion + canon-builder agent + Redis
M8  — Timeline visualization ("you are here")
M9  — Repair verify-loop agent
M10 — Deploy + demo rehearsal
M11 — Relationship graph (skip if behind)
```

Get the **fake** demo fully clickable (M1) before anything is real. That's the permanent fallback and the thing that ships on day one.

---

## What's Not Built (and Why)

- No prose generation. Continuum generates *fixes* and *structured data* — never narrative content.
- No chatbot UI. No message bubbles. This is a tool, not a buddy.
- No production auth / accounts / billing.
- No generic knowledge-graph / domain selector / legal templates. The engine is domain-neutral; the product is fiction, full stop.
- No live cold-ingestion on stage. Demo ingestion is pre-cached.

> If a feature doesn't serve **canon → draft → contradiction → evidence → fix**, it's out.
