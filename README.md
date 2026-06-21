# Continuum

> **Continuum is a consistency engine for evolving knowledge systems.**

Any system where facts accumulate over time — and new claims must stay consistent with what came before — has a consistency problem. Continuum solves it: load your source of truth, write something new, and every claim that contradicts established facts is flagged inline, with the exact evidence it conflicts with and a verified fix.

We built and demoed on **fictional worlds** because they're the hardest case. Nonlinear timelines, branching paths, hidden knowledge, object state, world rules, character beliefs — if the engine works here, every other domain is easier. The same primitives power **AI agent memory**, product specs, legal case facts, and research claims.

---

## The Problem

Every long-running knowledge system is a giant pile of mutable state. Someone — or something — must hold it all in their head simultaneously:

- **Who is in what state** — alive, dead, injured, exiled, under NDA, decommissioned, deprecated
- **Where things are** — who owns an asset, which version is deployed, what's locked in a vault
- **What relationships hold** — allies, enemies, dependencies, contracts — and *when* each became true
- **What rules govern the world** — physics, API contracts, legal constraints, capability limits
- **What order events happened** — and how claims that reference earlier state should be filtered
- **Which branch of reality applies** — alternate outcomes, divergent versions, A/B states, hypotheticals
- **Who knows what** — information asymmetry between agents, characters, or documents

Existing tools fail the same way across every domain: knowledge accumulates in **passive documents** that require manual upkeep and never check new claims against themselves. They go stale the moment output outpaces note-taking. Generic AI makes it worse — it generates more content with no model of *your* established state.

**Continuum makes accumulated knowledge checkable.** Upload your source of truth, write something new, and see every inconsistency — with the exact evidence, severity, and a fix that preserves what you actually meant.

---

## Why Fiction Is the Proving Ground

We didn't pick fiction arbitrarily. TV show writers' rooms, novelists, game designers, and show runners face the **most adversarial** version of this problem:

- Facts span hundreds of pages and years of real time
- Timelines are nonlinear — flashbacks, flash-forwards, myths, visions, prophecies
- State branches — player choices, alternate outcomes, divergent episodes
- Knowledge is asymmetric — characters believe different things; narrators reveal selectively
- Contradictions are invisible to generic AI — which has no model of your specific world

If Continuum catches broken canon in a Game of Thrones scene, it can catch contradictions in AI agent memory, product specs, and legal filings. The fiction case is harder.

**The direct read-across: AI agent memory.** Long-running agents accumulate facts that drift, contradict, and branch across sessions — exactly the same primitives. An agent's memory is a canon; each new action is a scene; hallucinated or stale state is a continuity error. Continuum is the consistency layer that agent builders need.

---

## The Demo

The demo world is a preloaded **Game of Thrones** canon: 8 facts, a branching timeline, and two alternate-history branches. Paste this into the editor and hit **Check Continuity**:

> *"Jaime tightened the straps on both gauntlets before drawing his sword. He had ridden from Winterfell at first light and reached King's Landing by sunset. Over the capital, three dragons wheeled in formation — a sight every lord had grown up seeing. In the branch where Robb Stark survived the massacre at the Twins, his mother Catelyn was already dead in the great hall."*

**Four high-severity contradictions surface, each with the exact canon evidence:**

| Highlighted Phrase | Issue | Evidence |
|--------------------|-------|----------|
| "both gauntlets" | `character_state` | Jaime lost his right hand after capture |
| "reached King's Landing by sunset" | `travel_time` | Winterfell → King's Landing takes weeks of hard riding |
| "dragons wheeled … every lord had grown up seeing" | `world_rule` | No living dragons existed until Daenerys hatched hers |
| "Robb survived … Catelyn was already dead" | `branch` | In the Robb-lives branch, Catelyn also survived |

**The timeline beat:** flip the context chip to *Flashback — before Jaime's capture* and write `"Jaime caught the wine cup with both hands."` — **zero warnings.** The lost-hand fact isn't in force yet. The timeline visualization shows "you are here" before the event and greys it out. The model never even sees the conflicting fact — the filtering happens in code before any LLM call.

---

## Architecture

### Three-Panel Interface

```
┌──────────────────────────────────────────────────────────────────┐
│  Continuum   [ Demo World: Game of Thrones ]    [Check Continuity]  │
├──────────────┬───────────────────────────────────┬───────────────┤
│  KNOWLEDGE   │  DRAFT / INPUT                     │  ISSUES       │
│  BIBLE       │  Context: [Main timeline ○]         │               │
│              │                                    │  ● HIGH       │
│  Entities    │  Jaime tightened the straps on     │  char_state   │
│  Rules       │  ░both gauntlets░ before drawing   │               │
│  Timeline    │  his sword. He had ridden from     │  ● HIGH       │
│  ──●── here  │  Winterfell at first light and     │  travel_time  │
│  Branches    │  reached ░King's Landing by sunset░ │               │
│              │                                    │  [Apply fix ✓]│
└──────────────┴───────────────────────────────────┴───────────────┘
```

### The Engine Pipeline

Every consistency check runs a **2-call hot path** — not an agentic loop. Speed matters for a live editing experience.

```
1. extractClaims(inputText)             ← Claude Haiku (fast)
   → Claim[] + inferredContext          (pre-fills context chips)

2. filterFacts(claims, position, branch)   ← pure TypeScript
   → only facts in force for this context's time window + branch

3. detectContradictions(claims, facts)     ← Claude Sonnet + extended thinking
   → Issue[] with evidence, spans, suggested fixes

4. mapSpans(issues, inputText)          ← indexOf + fuzzy fallback
   → character offsets for inline decorations
```

The filtering in step 2 is the core accuracy insight: **the model only ever sees facts that are actually in force for this context.** This eliminates false positives from stale or future state without asking the model to reason about time. In agent memory terms: only facts that were established before this action are candidates for contradiction.

### Two Real Agents

**Knowledge-builder agent** (`lib/agents/canonBuilder.ts`): a tool-using loop that converts raw source text into structured entities, facts, events, and branches. Tools: `add_entity`, `add_fact`, `add_event`, `add_branch`, `search_existing_canon`. Self-reviews validity windows and branch tags before committing. Writes embeddings to Redis for retrieval and deduplication.

**Repair verify-loop agent** (`lib/agents/repairVerify.ts`): when you click Apply Fix, it patches the text, re-runs the hot-path check on the patched span, and only returns `verified: true` if the original contradiction is gone with no new issues introduced. Never applies an unverified patch.

### Time & Branch Model

Every fact has two nullable validity event IDs defining its window of truth:

```ts
fact.validityStartEventId  // fact becomes true at this event
fact.validityEndEventId    // fact stops being true at this event (exclusive)
```

A scene or action's chronological position `p` drives filtering:

```ts
function isFactInForce(fact, p, events): boolean {
  const start = fact.validityStartEventId ? orderOf(start, events) : -Infinity;
  const end   = fact.validityEndEventId   ? orderOf(end, events)   : +Infinity;
  return p >= start && p < end;
}
```

Main timeline → `p = +∞` (all established facts apply). Flashback → `p < order(anchorEvent)`. **The model never sees filtered-out facts.** No temporal reasoning in the prompt; no false positives.

Branches are flat off `main`. Per-claim branch scoping fires when text names an alternate branch inline — the server resolves it by substring match and filters facts for that claim's branch independently.

---

## Domain-Neutral Data Model

The engine primitives contain no domain-specific assumptions. `Entity.type` is a string enum; for the fiction demo it holds `character | location | faction | object | event | rule`. For an agent memory system it holds `agent | session | capability | constraint`. The schema is identical.

```ts
Entity         // anything with identity that can have state
CanonFact      // a statement that is true within a defined window + branch
TimelineEvent  // a point in the ordering (integer, monotonic)
Branch         // an alternate path from main (flat for MVP)
Claim          // an assertion extracted from new input text
ContinuityIssue // a claim that contradicts an in-force fact — with evidence + fixes
SuggestedFix   // minimal edit to input text or update to knowledge base
```

The engine interface:

```ts
checkScene(claims: Claim[], facts: CanonFact[], context: SceneContext) => ContinuityIssue[]
```

Nothing here says "story." Swap the seed data and prompts, and the same pipeline checks:

| Domain | "Canon" | "Scene" | "Contradiction" |
|--------|---------|---------|-----------------|
| Fiction / TV | Show bible | New scene draft | Broken continuity |
| AI agent memory | Accumulated facts | New action / output | Hallucinated or stale state |
| Product specs | Spec document | PR / implementation | Feature drift |
| Legal | Case record | New filing or brief | Inconsistent claim |
| Research | Prior literature | New paper claim | Conflicting finding |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Single repo; engine callable without HTTP |
| Editor | TipTap (ProseMirror) | Stable span decorations + programmatic text replace |
| State | Zustand | Flat, typesafe; issues + scene + selection in one store |
| AI | Anthropic Claude | Extended thinking on detection; structured tool-use outputs |
| Memory | Upstash Redis + Vector | Fact embeddings, agent scratchpad, check/ingest cache |
| Observability | Arize (OpenTelemetry) | Named span per AI step; shown before/after prompt improvement |
| Validation | Zod + zod-to-json-schema | Shared schema as both runtime type and tool `input_schema` |
| Styling | Tailwind v4 | Dark editorial aesthetic — no chat bubbles |

---

## Sponsor Integrations

### Anthropic — the reasoning layer

Every AI call is structured, never freeform:

- **Claim extraction**: Haiku-class model returns `Claim[]` + `inferredContext` via `emit_claims` tool
- **Contradiction detection**: Sonnet/Opus with **extended thinking** returns `ContinuityIssue[]` via `emit_issues` tool — this is the product
- **Knowledge-builder agent**: mid/strong model with 5 tools; self-reviews before committing facts
- **Repair verify-loop agent**: fast model; proposes → patches → re-checks → confirms

*"Claude extracts state, reasons about contradictions with extended thinking, and powers the agents that build and verify canon — the same architecture agent builders need for persistent memory consistency."*

### Redis — persistent memory at scale

```
canon:fact:{id}              → fact JSON + embedding vector
canon:idx:{projectId}        → KNN vector index for semantic retrieval
agent:canon:{sessionId}:*    → knowledge-builder working memory across tool turns
check:{hash(text+context)}   → cached check result (demo pre-warm)
ingest:{hash(text)}          → cached ingestion output
```

`search_existing_canon` hits the Redis vector index during ingestion to deduplicate before committing. Same `FactRetriever` interface switches between in-memory (dev) and Redis vector search (ship) with no engine changes.

*"Redis remembers the world so Claude can reason over it — retrieval, agent scratchpad, and result cache in one place."*

### Arize — observability-driven improvement

Every AI step emits a named OpenTelemetry span:

```
ai.claims.extract    → claims + inferredContext
ai.context.infer     → nested within extract
ai.issues.detect     → contradiction detection (+ extended thinking trace)
ai.repair.propose    → fix proposal
ai.repair.verify     → re-check pass/fail
ai.canon.builder     → agent loop (per tool call sub-span)
```

Demo shows a real before/after: Arize revealed over-flagging on the GoT draft → detection prompt tightened → improvement documented as `detect-v1.ts` → `detect-v2.ts`.

*"We trace every check, found over-flagging in Arize, tightened the prompt, and shipped the fix — here's the diff."*

---

## Project Structure

```
continuum/
  app/
    page.tsx                      # three-panel shell
    api/
      check/route.ts              # POST — 2-call hot path (core)
      ingest/route.ts             # POST — knowledge-builder agent + file upload
      repair/route.ts             # POST — repair verify-loop
      project/route.ts            # GET — full knowledge base
      canon/fact/route.ts         # POST — add/update a fact from an issue
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
    types.ts                      # all interfaces — domain-neutral primitives
    engine/
      checkScene.ts               # pipeline orchestrator — no Next.js dependency
      resolveContext.ts           # context → chronological position
      filterFacts.ts              # time validity + branch filter
      mapSpans.ts                 # model quotes → character offsets
    ai/
      models.ts                   # explicit model routing per task
      schemas.ts                  # Zod schemas (= tool input_schema)
      prompts/                    # extract, detect, fix, builder templates
      tasks/
        extractClaims.ts
        detectContradictions.ts
        generateFixes.ts
    agents/
      canonBuilder.ts             # knowledge ingestion agent
      repairVerify.ts             # fix verify-loop agent
    store/
      memoryStore.ts              # in-memory (dev fallback)
    telemetry/                    # Arize / OpenTelemetry export
  seed/
    world.ts                      # GoT primary (8 facts, typed, stable IDs)
    world-moonstone.ts            # zero-IP fallback (The Moonstone Saga)
```

`lib/engine/checkScene.ts` has no Next.js dependency. The HTTP handler is a thin adapter. A browser extension, Google Docs add-on, or agent runtime calls the same `/api/check` endpoint and receives `ContinuityIssue[]` — no engine changes required.

---

## Running Locally

```bash
npm install

cp .env.example .env.local
# Required:
# ANTHROPIC_API_KEY=...
# Optional (dev fallback works without these):
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
# UPSTASH_VECTOR_REST_URL=...
# UPSTASH_VECTOR_REST_TOKEN=...
# OPENAI_API_KEY=...         (text-embedding-3-small for vector indexing)
# ARIZE_SPACE_ID=...
# ARIZE_API_KEY=...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The GoT demo world loads immediately — no setup required. The app runs with only `ANTHROPIC_API_KEY` in dev; Redis and Arize are required for the full ship target.

---

## The Generalization

> Long-running AI agents are knowledge systems without a knowledge base. They accumulate facts, contradict themselves, and never cite sources. Continuum is the consistency layer they need — the same engine, different seed data and prompts.
>
> We chose the hardest case to prove it on first. Westeros has nonlinear time, branching history, hidden knowledge, and object state. If the engine catches broken canon there, it catches stale agent memory, drifted specs, and contradicted case facts too.
>
> Same primitives. Swappable config. One engine.

---

## What's Not Built (and Why)

- **No prose generation.** Continuum generates *fixes* and *structured facts* — never content for the user's document.
- **No chat UI.** This is a tool, not a conversational assistant. No message bubbles.
- **No domain selector.** The engine is already domain-neutral; the product is focused. Generality is in the architecture, not a dropdown.
- **No live cold-ingestion on stage.** All demo ingestion is pre-cached by hash.
- **No production auth / billing / multi-tenancy.**

> If a feature doesn't serve **source of truth → new claim → contradiction → evidence → verified fix**, it's out.
