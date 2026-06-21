# Continuum — Design Document

> **Status:** Hackathon build spec / source of truth for implementation
> **Audience:** You + a coding agent (Claude Code / Cursor)
> **One-liner:** Grammarly catches grammar. Continuum catches broken canon.
> **Thesis:** Continuum is state management for stories.

This document is opinionated on purpose. Where the brief left a decision open, this doc makes the call so the coding agent never has to guess. If you disagree with a call, change it *here* before you start coding — this file is the contract.

---

## 1. Executive Summary

Continuum is a **live consistency engine for evolving fictional worlds**. A writer loads a story world (the "canon") — by upload, paste, or preloaded seed — writes a new scene in a live editor, sets scene context (manually or via AI-inferred chips), and Continuum highlights phrases that contradict established canon — inline, with evidence quotes from the source material and one-click fixes verified by a repair loop.

The product is **not** an AI story generator. It generates *nothing* that goes into the prose. It is a **canon-aware guardrail** that preserves the writer's voice and flags *possible* contradictions (never "errors"), which the writer can ignore, mark intentional, or use to update canon.

The architecture is built on **general primitives** — entities, facts, claims, sources, relationships, timelines, branches, evidence, contradictions, fixes — so the engine could later check AI agent memory, product specs, or legal facts. But the MVP, UI, sample data, prompts, and demo are **100% fiction/TV-world**. We generalize the data model, not the product experience. The closing demo beat (~20–30 sec) names **AI agent memory consistency** as the primary generalization frame; product specs and legal facts get a quick secondary mention only.

The hackathon deliverable is a **three-panel web editor** (canon bible | live editor | issue cards) running on a preloaded **Game of Thrones (show) demo world** (≤8 canonical facts, all scene prose original — no copyrighted text reproduced), with real Claude-powered ingestion, contradiction checking, and fix verification. The whole thing is built to nail a **3-minute demo**: show ingested/structured canon → write a contradictory scene → watch real contradictions light up with evidence → apply a verified fix → flip to flashback and show timeline awareness → close with the agent-memory generalization beat.

**Core engineering bet:** separate a platform-agnostic `ContinuityEngine` (claims + facts + context → issues) from every UI surface, so the web editor, a future browser extension, and a future Google Docs add-on all call the same API. Build the engine once; bolt surfaces on later.

---

## 2. Product Thesis

Three nested framings, narrowest first. Use the narrow one in the demo; keep the broad ones for the "where this goes" slide.

1. **Tactical pitch (use in demo):** *Grammarly catches grammar. Continuum catches broken canon.* Concrete, instantly legible, demoable in one sentence.

2. **Product thesis:** *Continuum is state management for stories.* A long-running narrative is a giant pile of mutable state — who's alive, who has the sword, who's at war, who knows the secret. Writers track this in their heads and in static "story bibles" that rot. Continuum makes story state a first-class, queryable, checkable object.

3. **Long-term vision (deliver as closing beat, ~20–30 sec / one slide — don't build):** *Continuum is a consistency layer for evolving knowledge systems.* Lead with **AI agent memory**: long-running agents accumulate facts that drift, contradict, and branch — the same primitives we use for story canon. Quick secondary mentions: product specs, legal case facts. At most one hardcoded non-fiction sample in the pitch; never a second domain built into the MVP.

Why fiction/TV is the right wedge: fictional worlds have the **most adversarial** consistency problems — nonlinear timelines, branching paths, hidden knowledge, intentional ambiguity, object state, world rules, character beliefs. If the engine works here, agent memory and the "boring" domains are easier. Plus GoT demos *beautifully*: everyone understands "wait, didn't Jaime lose his hand?"

---

## 3. Problem Statement

As a fictional world grows past a few dozen pages, its state exceeds what a human can reliably hold. The writer must remember, simultaneously and across hundreds of pages:

- **Character state:** alive, dead, injured, exiled, transformed, undercover, possessed.
- **Object state/location:** who holds the sword, where the moonstone is, whether the crown was stolen.
- **Relationships:** allies, enemies, family, betrayal, romance, mentor/student — and *when* each became true.
- **Faction state:** at war, allied, destroyed, secretly conspiring.
- **World rules:** magic constraints, tech limits, geography, travel times, physics.
- **Timeline order:** what happened before/after what, in-universe.
- **Nonlinear presentation:** flashbacks, flash-forwards, myths, visions, prophecies.
- **Branching:** player choices, alternate routes, divergent quest outcomes.
- **Knowledge state:** who knows what, who *believes* what, who is lying.
- **Open threads:** promises, foreshadowing, unresolved mysteries, prophecies.

The existing tools fail in specific ways:

- **Generic AI writing assistants** generate more prose but have no persistent model of *your* world's state. They'll happily write a one-handed knight gripping with both gauntlets.
- **Story bibles / wikis (Notion, World Anvil, plain docs)** are useful but **passive** — they require manual upkeep and never *check* new writing against themselves. They go stale the moment writing outpaces note-taking.
- **Beta readers / editors** catch continuity errors but are slow, expensive, and don't scale to live drafting.

Continuum's job: **turn existing material into structured canon, then actively check new writing against it** — with evidence, in real time, in the editor.

---

## 4. Generalization Strategy

**Principle: Generalize the data-model primitives. Do not generalize the product experience.**

The data model is built from domain-neutral primitives:

`Entity` · `CanonFact` · `Claim` · `CanonSource` · `Relationship` · `TimelineEvent` · `Branch` · `ContinuityIssue` · `SuggestedFix`

None of these say "fantasy" in their structure. An `Entity` has a `type` field; for the MVP the allowed types are fiction/game types (`character`, `location`, `faction`, `object`, `event`, `rule`), but the schema doesn't care — tomorrow it could be `api_endpoint` or `legal_party`.

Likewise the `ContinuityEngine` interface is domain-neutral at the logical level:

```
checkScene(claims: Claim[], facts: CanonFact[], context: SceneContext) => ContinuityIssue[]
```

*(This is the **conceptual contract** — pre-extracted claims + pre-filtered in-force facts + resolved context → issues. The concrete implementation in `lib/engine/checkScene.ts` (§22) takes `(sceneText, context, store, retriever, ai)` and performs claim extraction + fact filtering internally before reaching this logical step. Both are called "checkScene" in this document at different levels of abstraction; §22 is the buildable function.)*

Nothing in the logical signature is fiction-specific. The fiction-ness lives in (a) the *seed data*, (b) the *prompts*, (c) the *UI labels and panels*.

**What we explicitly DO NOT do in the MVP:**

- No domain selector / "choose your workspace type" dropdown.
- No legal / product-spec / research templates.
- No generic knowledge-graph UI.
- No configurable entity-type editor.

When someone asks "could this do agent memory / product specs?" the answer is: "Yes — same engine, different seed data and prompts. We proved it on the hardest narrative case; agent memory is the direct read-across." Save the full generalization for the **closing beat** (§9); during the main demo, stay on GoT canon.

The single architectural seam that earns the generalization claim: **the engine is a separate module with a pure interface, and the prompts/seed data are swappable config.** That's the whole bet. Don't build more than that.

---

## 5. Target Users

**Primary MVP user (design everything for this person):**
- A TV/fantasy writer or show-runner's-room member with a complex serial world (GoT-class). They have canon notes (messy docs) and are actively drafting. They've shipped continuity bugs and been burned in reviews or fan reaction.

**Secondary users (the demo gestures at these, esp. the branch feature):**
- Narrative game designer (branching quests, multiple endings).
- RPG / D&D dungeon master (persistent world state across sessions).
- Interactive fiction / visual novel writer (explicit branches and flags).
- AI roleplay world builder (persistent character/world state for agents).
- TV writers'-room member (continuity across episodes/seasons).

**Future generalized users (one slide, never built in MVP):**
- PMs maintaining evolving specs; engineers reconciling docs/tickets/code; researchers tracking claims across papers; legal teams tracking case facts; AI agent builders maintaining persistent memory.

The branching feature is what makes this feel **bigger than a novelist tool** and pulls in the game/interactive-fiction audience. Keep it in the demo for exactly that reason.

---

## 6. MVP Definition

The MVP is a **single-page, three-panel web app** with a preloaded GoT demo world, file/paste ingestion, and real AI-powered checks. That's it.

**In the MVP, a user can:**

1. Open the app to a preloaded **Game of Thrones (show) demo world** (no login, no setup). Moonstone Saga (`seed/world-moonstone.ts`) ships as a zero-IP fallback.
2. **Upload or paste canon** (`.txt`, `.md`, `.docx`) and see it structured into the left-panel bible via the canon-builder agent.
3. See structured canon in the left panel: characters, locations, factions, objects, world rules, timeline events, branches, relationships — with a **timeline track** showing scene position and dimmed not-yet-in-force facts.
4. Write/paste a scene in the center editor.
5. Set **scene context** via editable chips (presentation + anchor event + branch). The claim-extraction step **infers** context and pre-fills chips; the selector remains source of truth. No timing signal → default silently to `Main timeline / now` as an **unconfirmed** chip (no prompt). Only prompt the writer when inference signals **conflict**. One context per scene/draft for MVP.
6. Trigger a continuity check (button click; debounced auto-check optional).
7. See contradictory phrases **highlighted inline** in the editor.
8. Click a highlight (or its card) to see: issue type, severity, plain-English explanation, **evidence quote + source reference**, conflicting fact(s), and **suggested fixes**.
9. Act on an issue: **Apply fix** (via repair verify-loop agent) / **Ignore** / **Mark intentional** / **Update canon**.

**The MVP must visibly demonstrate, on stage:**
- Structured canon (left panel — from seed or **pre-cached ingestion**, never live cold-ingestion on stage).
- A new contradictory draft (center) — **original prose, no copyrighted text**.
- Live/in-editor contradiction highlights (center).
- Evidence-backed issue panel (right).
- Timeline awareness (flashback false-positive suppressed; **timeline viz shows "you are here"**).
- Branch awareness (alternate-timeline branch contradiction fires).
- **Closing beat:** agent-memory consistency generalization (~20–30 sec).

**Must-have (cut nothing here):**
- Polished three-panel UI.
- Preloaded GoT demo world (≤8 canonical facts; see §10.1).
- **Canon ingestion + file upload** (`.txt` / `.md` / `.docx`; `.pdf` nice-to-have).
- Canon-builder agent (powers ingestion).
- Story bible / canon panel.
- Live editor with **hybrid scene-context chips** (manual + AI-inferred).
- Real contradiction checking (Claude 2-call hot path + extended thinking on detection).
- Repair verify-loop agent (apply fix → re-check → confirm).
- Inline highlights.
- Issue cards with evidence.
- Suggested fixes.
- Branch + timeline awareness.
- **Timeline visualization** with scene-position marker + dimmed out-of-window facts.
- **Arize tracing** (real instrumentation; show before/after prompt improvement).
- **Redis** vector retrieval over canon facts + agent memory for canon-builder.

**Should-have (build if time after must-haves):**
- Story-bible dashboard polish (counts, grouping).
- Issue status lifecycle (open/ignored/intentional/resolved), in-memory.
- Context inference "it figured this out" moment on a scene with clear flashback cues.

**Nice-to-have (only if everything else is solid):**
- `.pdf` upload.
- Relationship graph (React Flow).
- Browser extension/sidebar stub.
- Export story bible (JSON/Markdown).
- One hardcoded non-fiction sample for the closing generalization slide (never a second built domain).

---

## 7. Non-Goals / Out of Scope

Explicitly **not** building (and the agent must not drift into these):

- Full novel/prose generation. Continuum writes *fixes*, never *story*.
- A Google Docs clone or a full rich-text word processor.
- Production Google Docs integration / real-time inline Google comments.
- Full D&D campaign manager or game engine.
- Production auth, multi-tenant accounts, billing.
- *Perfect* contradiction detection. We optimize for high-signal demo cases, not recall on arbitrary text.
- Ingesting arbitrary 500-page books. Demo canon is small and curated (≤8 facts for GoT seed; see §10.1).
- Live cold-ingestion on stage. Demo uses **pre-tested, pre-cached** ingestion input only.
- Mobile app.
- Generic enterprise knowledge base.
- Generic legal/product/research consistency templates or a domain selector.
- A second fully-built non-fiction domain in the MVP (one hardcoded sample for the closing slide is fine).

If a feature doesn't serve **canon → draft → contradiction → evidence → fix**, it's out.

---

## 8. Core User Flow

```
                       ┌─────────────────────────────────────────────┐
   Load demo world ──▶ │  Canon loaded into store (entities, facts,   │
   (or paste canon)    │  timeline events, branches, relationships)   │
                       └───────────────────┬─────────────────────────┘
                                           │
                                           ▼
                       ┌─────────────────────────────────────────────┐
   Write/paste scene   │  Editor holds draft text + SceneContext      │
   (context chips:    │  chips (manual source of truth; AI-inferred   │
   manual or inferred)│  pre-fill from claim extraction)             │
                       └───────────────────┬─────────────────────────┘
                                           │  click "Check" / debounce
                                           ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  CONTINUITY ENGINE PIPELINE                                    │
        │                                                                │
        │  1. extractClaims(sceneText, contextHint) ── Claude ──▶       │
        │       Claim[] + inferredContext (presentation/anchor/branch)   │
        │       → pre-fill context chips if unconfirmed                  │
        │  2. resolve final SceneContext (user chips override inference) │
        │  3. for each claim: gather candidate facts                     │
        │       (filter by entity + branch + time validity)             │
        │  4. detectContradictions(claims, candidateFacts, context)      │
        │                                          ── Claude ──▶ Issue[] │
        │  5. (on Apply fix) repairVerifyLoop: propose → re-check → OK   │
        └───────────────────────────────────┬───────────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────────┐
   Inline highlights   │  Issues mapped to text spans → editor marks  │
   + issue cards    ◀──│  Right panel renders cards (sorted severity) │
                       └───────────────────┬─────────────────────────┘
                                           │  user clicks issue
                                           ▼
                       ┌─────────────────────────────────────────────┐
   Resolve             │  Detail: explanation, evidence quote +       │
                       │  source, conflicting facts, suggested fixes  │
                       │  Actions: Apply fix · Ignore · Mark           │
                       │  intentional · Update canon                  │
                       └─────────────────────────────────────────────┘
```

Time/branch filtering happens **before** the contradiction-detection LLM call so the model only ever sees facts that are actually in force for this scene's chronological position and branch. This is what kills the flashback false-positive cheaply, without asking the model to reason about time from scratch.

---

## 9. Demo Script

Target: **3 minutes.** Rehearse it. Every beat below is a thing the audience *sees happen*. **Never run live cold-ingestion on stage** — use pre-cached ingestion or the GoT seed.

**[0:00–0:20] The hook.**
"Grammarly catches grammar. We built Continuum — it catches broken canon." Gesture at the left panel: GoT characters, world rules, timeline with a **"you are here" marker**, two alternate-timeline branches. "We uploaded notes on the show — structured, queryable, not hardcoded answers." *(If showing ingestion: use a pre-tested paste/file whose result is already cached.)*

**[0:20–0:50] The setup.**
"I'm the writer. I just drafted a new scene — original prose, not from the show." Paste the contradictory draft into the center editor. Context chip reads **Main timeline** (unconfirmed or confirmed). "Looks fine to a generic AI. Watch what happens when Continuum reads it against the canon." Click **Check Continuity**. *(Bonus if inference pre-filled context correctly on a cue-heavy scene — not required for the main beat.)*

**[0:50–1:40] The payoff.**
Four–five highlights light up. Walk three of them:
- Click the **both hands** highlight → *"Character-state contradiction. Jaime lost his right hand after his capture."* Show **evidence quote** and source. "It's not guessing. It's citing the canon."
- Click the **overnight travel** highlight → *"Travel-time contradiction. Winterfell to King's Landing takes weeks, not hours."*
- Click the **dragons** highlight → *"World-rule contradiction. No living dragons existed until Daenerys hatched her eggs in Essos."*

**[1:40–2:00] The branch flex.**
Click the **Red Wedding branch** highlight → *"Branch contradiction. In the branch where Robb survived the Twins, Catelyn can't already be dead in the hall."* "Alternate timelines — the same engine game writers and TV rooms need."

**[2:00–2:30] The smart part (timeline awareness).**
**Manually flip** the context chip to **Flashback — before Jaime's capture**. Type: *"Jaime caught the wine cup with both hands."* Click Check. **No warning.** Point at the timeline viz: *"You are here" marker moved; the lost-hand fact is greyed out — not in force yet.* "Narrative order ≠ world chronology. We filter in code, not hope the model guesses."

**[2:30–2:50] The fix + verify.**
Click **Apply fix** on one issue → repair agent patches text → re-checks → highlight clears. "Verified fix — it re-ran the check and confirmed no new contradiction."

**[2:50–3:00] The close (generalization beat).**
"Continuum is state management for stories. Same primitives power **AI agent memory** — facts that accumulate, branch, and contradict over long runs. Product specs and legal facts are the same shape. We proved it on the hardest case first." Done.

**Demo failure modes to pre-empt:** hardcoded fallback on LLM error; pre-warm + cache the demo check; **never cold-ingest on stage**; backup screen recording.

---

## 10. Demo World and Sample Data

**Primary demo world:** Game of Thrones (HBO show canon). **≤8 canonical facts (3b and 5b added for correctness; see §10.1 note).** All scene prose in this doc and in the app is **original** — no copyrighted dialogue or narration reproduced. Ship as `seed/world.ts` (typed) and `seed/world.json` (raw).

**Zero-IP fallback:** The Moonstone Saga lives in **§10.8** — use `seed/world-moonstone.ts` if GoT is undesirable or for local testing without pop-culture baggage.

The GoT seed must produce the intended contradictions plus the flashback false-positive suppression case. Curate facts + prompts together; run the golden test (§26).

### 10.1 Canon facts — GoT (the source of truth)

| # | Fact | Type | Entities | Branch | Validity |
|---|------|------|----------|--------|----------|
| 1 | Jaime Lannister lost his right sword hand after being captured. | character_state | Jaime | all | from `evt_jaime_captured` onward |
| 2 | Ned Stark was executed at King's Landing. | character_state | Ned Stark | all | from `evt_ned_executed` onward |
| 3 | No living dragons existed anywhere in the known world. | world_rule | Dragons, Daenerys | all | `validityStart: null`, `validityEnd: evt_dragons_hatched` (exclusive) |
| 3b | Daenerys Targaryen's three dragons, hatched in Essos, are the first living dragons in a generation; no lord or commoner grew up knowing living dragons. | world_rule | Dragons, Daenerys | all | `validityStart: evt_dragons_hatched`, `validityEnd: null` |
| 4 | Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day. | world_rule | Winterfell, King's Landing | all | `validityStart: null`, `validityEnd: null` (always) |
| 5 | (Branch A — "Robb lives") Robb Stark survived the massacre at the Twins. | branch_state | Robb Stark | branch_robb_lives | `validityStart: evt_red_wedding`, `validityEnd: null` |
| 5b | (Branch A — "Robb lives") Catelyn Stark also survived the massacre at the Twins. | branch_state | Catelyn Stark | branch_robb_lives | `validityStart: evt_red_wedding`, `validityEnd: null` |
| 6 | (Branch B — canon) Robb Stark and Catelyn Stark were killed at the Red Wedding. | branch_state | Robb Stark, Catelyn Stark | branch_canon | `validityStart: evt_red_wedding`, `validityEnd: null` |

*Eight facts total. Fact 3/3b form a pair: pre-hatch (no dragons, valid until `evt_dragons_hatched`) and post-hatch (dragons newly exist but no one grew up with them, valid from `evt_dragons_hatched` onward). The split is required because on the main timeline (p=+∞), Fact 3 is filtered out — without Fact 3b the dragon contradiction in §10.6 would never fire. Facts 5/5b together cover both Stark survivors in the Robb-lives branch, making the §10.6 branch contradiction fully entailed by data rather than model inference. Knowledge-state and additional characters can appear in the entity list but are not required for the demo contradictions.*

### 10.2 Entities — GoT

- **Characters:** Jaime Lannister, Ned Stark, Robb Stark, Catelyn Stark, Daenerys Targaryen.
- **Locations:** Winterfell, King's Landing, the Twins.
- **Objects:** Dragon eggs (stone until hatched).
- **Factions:** (optional in seed) Stark, Lannister — only if needed for bible display.

### 10.3 Timeline events — GoT (ordered, in-universe)

```
evt_ned_executed      (Ned beheaded at King's Landing)
evt_jaime_captured    (Jaime loses his right hand)
evt_red_wedding       (branch point: Robb lives vs dies)
evt_dragons_hatched   (Daenerys hatches three dragons in Essos)
```

Order matters for time-validity filtering. Store an integer `order` on each event.

### 10.4 Branches — GoT

```
main
 ├─ branch_robb_lives   (alternate: Robb survives the Twins)
 └─ branch_canon        (show canon: Robb and Catelyn die at the Red Wedding)
```

Flat off `main` for MVP. The contradictory draft can name a branch inline; per-claim branch scoping applies when filtering facts (see §14.4).

### 10.5 The contradictory draft — GoT (paste target, original prose)

> "Jaime tightened the straps on both gauntlets before drawing his sword. He had ridden from Winterfell at first light and reached King's Landing by sunset. Over the capital, three dragons wheeled in formation — a sight every lord had grown up seeing. In the branch where Robb Stark survived the massacre at the Twins, his mother Catelyn was already dead in the great hall."

### 10.6 Expected issues — GoT (engine MUST produce on `Main timeline` / `branch_canon`)

1. **character_state** — "both gauntlets" / fighting with two hands contradicts Fact 1 (Jaime lost his right hand). Severity: high.
2. **travel_time** — "reached King's Landing by sunset" (from Winterfell at first light) contradicts Fact 4 (weeks of travel). Severity: high.
3. **world_rule** — "dragons wheeled … every lord had grown up seeing" contradicts Fact 3 (no living dragons until Dany hatches them). Severity: high.
4. **branch** — "branch where Robb survived … Catelyn was already dead" contradicts **Fact 5b** (in the Robb-lives branch, Catelyn Stark also survived — her being "already dead in the great hall" is a direct contradiction). Severity: high.

*Target four high-signal issues on main timeline; a fifth (e.g. Ned alive) is optional bonus if the draft mentions it.*

### 10.7 The false-positive suppression case — GoT (the "smart" demo beat)

- Canon: Fact 1 (Jaime loses right hand at `evt_jaime_captured`).
- Scene context: **Flashback — before `evt_jaime_captured`** (manual chip flip drives this beat on stage).
- Draft: "Jaime caught the wine cup with both hands."
- **Expected: NO contradiction.** Fact 1's validity window starts at `evt_jaime_captured`; a scene before that event filters the fact out. Timeline viz shows **"you are here"** before the event and greys out the lost-hand fact.

Keep two prepared drafts: the main contradictory draft (§10.5) and the one-line flashback draft.

### 10.8 Fallback demo world — The Moonstone Saga (zero-IP)

Use when GoT is not appropriate. Ship as `seed/world-moonstone.ts`. Same engine, fantasy RPG facts — fully documented here for agents that need a copyright-safe test world.

**Canon facts:**

| # | Fact | Type | Entities | Branch | Validity |
|---|------|------|----------|--------|----------|
| 1 | Elira can only cast magic while carrying a moonstone. | world_rule | Elira, Moonstone | all | always |
| 2 | The moonstone was stolen by the Red Court and locked in their vault. | object_state | Moonstone, Red Court | all | from `evt_moonstone_stolen` onward |
| 3 | Daren lost his left hand during the Siege of Veyr. | character_state | Daren | all | from `evt_siege_veyr` onward |
| 4 | Crossing the Ash Desert takes twelve days. | world_rule | Ash Desert | all | always |
| 5 | Mira and Kael were enemies until the Treaty of Thorns. | relationship | Mira, Kael | all | enemies before `evt_treaty_thorns` |
| 6 | (Branch A) Mira survives the Red Gate quest and gives the Sunblade to the player. | branch_state | Mira, Sunblade | branch_a | from `evt_red_gate` onward |
| 7 | (Branch B) Mira dies during the Red Gate quest; Kael inherits the Sunblade. | branch_state | Mira, Kael, Sunblade | branch_b | from `evt_red_gate` onward |

**Timeline events:** `evt_siege_veyr` → `evt_moonstone_stolen` → `evt_treaty_thorns` → `evt_red_gate` → `evt_coronation`.

**Contradictory draft:** *"Elira whispered a spell and filled the room with blue fire, though the moonstone was still locked in the Red Court vault. Daren gripped the reins with both hands as they crossed the Ash Desert overnight. Mira smiled at Kael, remembering their childhood friendship. Later, in the branch where Mira died at the Red Gate, she handed the Sunblade to the player."*

**Flashback draft:** context Flashback-before-`evt_siege_veyr`, text *"Daren caught the apple with both hands"* → zero issues.

### 10.9 Ingestion demo input (pre-cached on stage)

Prepare a **short, hand-written canon summary** (~300–500 words, original prose summarizing show facts — not a script transcript). Verify in advance that `POST /api/ingest` (canon-builder agent) reconstructs ≥7 GoT facts (including Fact 3b and Fact 5b). **Cache the ingestion result**; on stage either show the pre-loaded bible or replay from cache. Never cold-ingest untested text live.

**Reference ingestion text** (original prose — use this exact text as the `POST /api/ingest` body to pre-cache):

> In the great continent of Westeros, the noble house of Stark rules from the castle of Winterfell in the frozen North. King's Landing serves as the kingdom's capital far to the south, and the overland journey between the two seats takes weeks of hard riding even for the swiftest messengers — a distance that cannot be covered in a single day no matter the urgency.
>
> Eddard Stark, the lord of Winterfell, once traveled south to serve as the King's Hand and was executed at King's Landing on charges of treason. His death fractured the kingdom and sent his eldest son to war.
>
> Among the warriors of the realm, Jaime Lannister was one of the most celebrated swordsmen alive. After his capture during the northern campaigns, he suffered a catastrophic wound: his right sword hand was severed by his captors. From that moment onward he cannot wield a blade in his dominant hand, and every account of him in the field after his capture reflects this permanent injury.
>
> The dragon — once a wonder of the ancient world — had been absent from the known world for generations before the events of this story. No living dragon existed in Westeros or Essos within living memory; there were no lords, smallfolk, or maesters who grew up knowing such creatures. That changed only when Daenerys Targaryen, last scion of a deposed royal line, carried three stone eggs into the flames of her late husband's funeral pyre on the Dothraki Sea in Essos. Against all expectation, the eggs hatched and three young dragons emerged. They are the first living dragons in the known world in a very long time — creatures whose existence is new and unprecedented for the entire living generation. No one grew up with them; no lord watched them in the sky as a child.
>
> The war in the North reached a turning point at a river crossing called the Twins, the seat of House Frey. The northern king Robb Stark rode there with his mother Catelyn Stark, seeking a military alliance. The events at the Twins diverge depending on which version of history one follows. In the canonical timeline, what followed became known as the Red Wedding — a treacherous massacre in which Robb Stark and Catelyn Stark were both killed by their hosts under a flag of guest right. Neither survived.
>
> In an alternate branching path — sometimes called the "Robb-lives" scenario — Robb Stark survived the massacre at the Twins, and his mother Catelyn Stark also survived alongside him. In this branch neither Stark was killed at the crossing; both lived, and the Northern army continued its campaign under their joint leadership.
>
> Across all timelines and branches, certain facts remain constant: the weeks-long travel time between Winterfell and King's Landing, Jaime Lannister's lost right hand after his capture, the newness of Daenerys's dragons for a world that had not seen such creatures in generations, and Ned Stark's execution at King's Landing.

**M7 acceptance:** `POST /api/ingest` on this text → canon-builder agent produces ≥7 facts covering all types in §10.1 (Fact 3b and Fact 5b included); events ordered correctly (`evt_ned_executed` < `evt_jaime_captured` < `evt_red_wedding` < `evt_dragons_hatched`); branch tags on Facts 5, 5b, 6 correct.

### 10.10 Reference seed skeleton — `seed/world.ts`

Paste-ready TypeScript with **stable IDs**. All tests, few-shots, and golden cases reference these constants — never hand-roll IDs. The agent must produce a file that matches this structure exactly.

```ts
// seed/world.ts — GoT reference seed with stable IDs
import type { Project, CanonSource, Entity, TimelineEvent, Branch, CanonFact } from '../lib/types';

// ── Project ───────────────────────────────────────────────────────────────────
export const PROJECT: Project = {
  id: 'proj_got_demo',
  name: 'Game of Thrones (Demo)',
  description: 'HBO show canon — demo world for Continuum.',
  createdAt: '2025-01-01T00:00:00Z',
};

// ── Source ────────────────────────────────────────────────────────────────────
export const SOURCE_SEED: CanonSource = {
  id: 'src_got_seed',
  projectId: 'proj_got_demo',
  title: 'GoT Demo World Bible (seed)',
  kind: 'seed',
  text: 'Manually curated seed facts for the Continuum GoT demo.',
  createdAt: '2025-01-01T00:00:00Z',
};

// ── Entities ──────────────────────────────────────────────────────────────────
export const ENTITY_JAIME: Entity    = { id: 'ent_jaime',        projectId: 'proj_got_demo', name: 'Jaime Lannister',      type: 'character', aliases: ['the Kingslayer'], summary: 'Right hand lost after capture.' };
export const ENTITY_NED: Entity      = { id: 'ent_ned',          projectId: 'proj_got_demo', name: 'Ned Stark',            type: 'character', aliases: ['Eddard Stark'],   summary: 'Executed at King\'s Landing.' };
export const ENTITY_ROBB: Entity     = { id: 'ent_robb',         projectId: 'proj_got_demo', name: 'Robb Stark',           type: 'character', aliases: ['King of the North'], summary: 'Fate is branch-dependent.' };
export const ENTITY_CATELYN: Entity  = { id: 'ent_catelyn',      projectId: 'proj_got_demo', name: 'Catelyn Stark',        type: 'character', aliases: ['Lady Stark'],     summary: 'Fate is branch-dependent.' };
export const ENTITY_DAENERYS: Entity = { id: 'ent_daenerys',     projectId: 'proj_got_demo', name: 'Daenerys Targaryen',   type: 'character', aliases: ['Dany','Khaleesi'], summary: 'Hatched three dragons in Essos.' };
export const ENTITY_WINTERFELL: Entity     = { id: 'ent_winterfell',     projectId: 'proj_got_demo', name: 'Winterfell',      type: 'location', summary: 'Stark seat in the North.' };
export const ENTITY_KINGS_LANDING: Entity  = { id: 'ent_kings_landing',  projectId: 'proj_got_demo', name: "King's Landing",  type: 'location', summary: 'Capital; weeks of travel from Winterfell.' };
export const ENTITY_THE_TWINS: Entity      = { id: 'ent_the_twins',      projectId: 'proj_got_demo', name: 'the Twins',       type: 'location', summary: 'Frey stronghold; Red Wedding site.' };
export const ENTITY_DRAGONS: Entity        = { id: 'ent_dragons',         projectId: 'proj_got_demo', name: 'Dragons',         type: 'object',   summary: 'First living dragons in a generation; hatched by Daenerys.' };

// ── Timeline events (order = in-universe sequence) ────────────────────────────
export const EVT_NED_EXECUTED:    TimelineEvent = { id: 'evt_ned_executed',    projectId: 'proj_got_demo', name: "Ned Stark executed at King's Landing",          order: 1, branchId: null };
export const EVT_JAIME_CAPTURED:  TimelineEvent = { id: 'evt_jaime_captured',  projectId: 'proj_got_demo', name: 'Jaime Lannister loses his right hand',           order: 2, branchId: null };
export const EVT_RED_WEDDING:     TimelineEvent = { id: 'evt_red_wedding',     projectId: 'proj_got_demo', name: 'The Red Wedding at the Twins (branch point)',    order: 3, branchId: null };
export const EVT_DRAGONS_HATCHED: TimelineEvent = { id: 'evt_dragons_hatched', projectId: 'proj_got_demo', name: 'Daenerys hatches three dragon eggs in Essos',   order: 4, branchId: null };

// ── Branches ──────────────────────────────────────────────────────────────────
export const BRANCH_MAIN:        Branch = { id: 'branch_main',        projectId: 'proj_got_demo', name: 'main',                       parentBranchId: null,          description: 'Default timeline root.' };
export const BRANCH_ROBB_LIVES:  Branch = { id: 'branch_robb_lives',  projectId: 'proj_got_demo', name: 'Branch A — Robb lives',      parentBranchId: 'branch_main', description: 'Alternate: Robb and Catelyn survive the Twins.' };
export const BRANCH_CANON:       Branch = { id: 'branch_canon',       projectId: 'proj_got_demo', name: 'Branch B — Canon (show)',    parentBranchId: 'branch_main', description: 'Show canon: Robb and Catelyn die at the Red Wedding.' };

// ── Canon facts ───────────────────────────────────────────────────────────────
const S = 'src_got_seed';
export const FACT_JAIME_HAND: CanonFact = {
  id: 'fact_jaime_hand', projectId: 'proj_got_demo',
  text: 'Jaime Lannister lost his right sword hand after being captured.',
  factType: 'character_state', entityIds: ['ent_jaime'], sourceId: S,
  sourceQuote: 'Jaime Lannister lost his right sword hand after being captured.',
  confidence: 1.0, branchId: null,
  validityStartEventId: 'evt_jaime_captured', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_NED_DEAD: CanonFact = {
  id: 'fact_ned_dead', projectId: 'proj_got_demo',
  text: "Ned Stark was executed at King's Landing.",
  factType: 'character_state', entityIds: ['ent_ned'], sourceId: S,
  sourceQuote: "Ned Stark was executed at King's Landing.",
  confidence: 1.0, branchId: null,
  validityStartEventId: 'evt_ned_executed', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_NO_DRAGONS: CanonFact = {
  id: 'fact_no_dragons', projectId: 'proj_got_demo',
  text: 'No living dragons existed anywhere in the known world.',
  factType: 'world_rule', entityIds: ['ent_dragons', 'ent_daenerys'], sourceId: S,
  sourceQuote: 'No living dragons existed anywhere until Daenerys Targaryen hatched three eggs in Essos.',
  confidence: 1.0, branchId: null,
  validityStartEventId: null,
  validityEndEventId: 'evt_dragons_hatched', // exclusive — filtered out on main timeline (p=+∞)
  epistemicStatus: 'objective',
};
export const FACT_DRAGONS_NEW: CanonFact = {
  id: 'fact_dragons_new', projectId: 'proj_got_demo',
  text: "Daenerys Targaryen's three dragons are the first living dragons in a generation; no lord or commoner grew up knowing living dragons.",
  factType: 'world_rule', entityIds: ['ent_dragons', 'ent_daenerys'], sourceId: S,
  sourceQuote: "Daenerys Targaryen hatched three dragon eggs in Essos — the first living dragons in a generation.",
  confidence: 1.0, branchId: null,
  validityStartEventId: 'evt_dragons_hatched', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_TRAVEL_TIME: CanonFact = {
  id: 'fact_travel_time', projectId: 'proj_got_demo',
  text: "Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day.",
  factType: 'world_rule', entityIds: ['ent_winterfell', 'ent_kings_landing'], sourceId: S,
  sourceQuote: "Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day.",
  confidence: 1.0, branchId: null,
  validityStartEventId: null, validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_ROBB_LIVES: CanonFact = {
  id: 'fact_robb_lives', projectId: 'proj_got_demo',
  text: 'Robb Stark survived the massacre at the Twins.',
  factType: 'branch_state', entityIds: ['ent_robb'], sourceId: S,
  sourceQuote: 'In the branch where Robb Stark survived the massacre at the Twins.',
  confidence: 1.0, branchId: 'branch_robb_lives',
  validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_CATELYN_LIVES: CanonFact = {
  id: 'fact_catelyn_lives', projectId: 'proj_got_demo',
  text: 'Catelyn Stark also survived the massacre at the Twins.',
  factType: 'branch_state', entityIds: ['ent_catelyn'], sourceId: S,
  sourceQuote: 'In the branch where Robb survived, Catelyn Stark also survived the massacre at the Twins.',
  confidence: 1.0, branchId: 'branch_robb_lives',
  validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_RED_WEDDING_CANON: CanonFact = {
  id: 'fact_red_wedding_canon', projectId: 'proj_got_demo',
  text: 'Robb Stark and Catelyn Stark were killed at the Red Wedding.',
  factType: 'branch_state', entityIds: ['ent_robb', 'ent_catelyn'], sourceId: S,
  sourceQuote: 'Robb Stark and Catelyn Stark were killed at the Red Wedding at the Twins.',
  confidence: 1.0, branchId: 'branch_canon',
  validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ── Exports ───────────────────────────────────────────────────────────────────
export const ENTITIES = [ENTITY_JAIME, ENTITY_NED, ENTITY_ROBB, ENTITY_CATELYN, ENTITY_DAENERYS, ENTITY_WINTERFELL, ENTITY_KINGS_LANDING, ENTITY_THE_TWINS, ENTITY_DRAGONS];
export const EVENTS   = [EVT_NED_EXECUTED, EVT_JAIME_CAPTURED, EVT_RED_WEDDING, EVT_DRAGONS_HATCHED];
export const BRANCHES = [BRANCH_MAIN, BRANCH_ROBB_LIVES, BRANCH_CANON];
export const FACTS    = [FACT_JAIME_HAND, FACT_NED_DEAD, FACT_NO_DRAGONS, FACT_DRAGONS_NEW, FACT_TRAVEL_TIME, FACT_ROBB_LIVES, FACT_CATELYN_LIVES, FACT_RED_WEDDING_CANON];
export const SOURCES  = [SOURCE_SEED];

export const GOT_WORLD = { project: PROJECT, sources: SOURCES, entities: ENTITIES, events: EVENTS, branches: BRANCHES, facts: FACTS };
```

**Stable ID reference** (use in tests, few-shots, golden cases — never re-derive):

| Constant | ID |
|---|---|
| `ENTITY_JAIME` | `ent_jaime` |
| `ENTITY_CATELYN` | `ent_catelyn` |
| `EVT_JAIME_CAPTURED` | `evt_jaime_captured` |
| `EVT_RED_WEDDING` | `evt_red_wedding` |
| `EVT_DRAGONS_HATCHED` | `evt_dragons_hatched` |
| `BRANCH_ROBB_LIVES` | `branch_robb_lives` |
| `FACT_JAIME_HAND` | `fact_jaime_hand` |
| `FACT_NO_DRAGONS` | `fact_no_dragons` |
| `FACT_DRAGONS_NEW` | `fact_dragons_new` |
| `FACT_CATELYN_LIVES` | `fact_catelyn_lives` |
| `FACT_TRAVEL_TIME` | `fact_travel_time` |

---

## 11. UX / UI Layout

A three-panel desktop layout. Serious creative tool, not a chatbot. No chat bubbles anywhere.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Continuum   [ Demo World: Game of Thrones ▾ ]           [Check Continuity ⏎]  │  top bar
├──────────────┬───────────────────────────────────────────┬─────────────────────┤
│  STORY BIBLE │  SCENE EDITOR                              │  CONTINUITY ISSUES  │
│  (left)      │  Context: [ Main timeline ○ ] [Branch: – ] │  (right)            │
│              │  (○ = unconfirmed chip; editable)           │                     │
│              │  ─────────────────────────────────────────│                     │
│ ▸ Characters │                                            │  ● HIGH  char_state │
│   Jaime      │  Jaime tightened the straps on ░both       │    Jaime two hands  │
│   Ned        │  gauntlets░ before drawing his sword. He   │    ───────────────  │
│   Robb       │  had ridden from Winterfell at first light │  ● HIGH  travel     │
│ ▸ Timeline   │  and reached King's Landing ░by sunset░.   │    Wfell→KL 1 day   │
│   ──●── you  │  Over the capital, ░three dragons wheeled  │  ● HIGH  world_rule │
│   are here   │  in formation — a sight every lord had     │    dragons extinct  │
│ ▸ Branches   │  grown up seeing. In the branch where Robb │  ● HIGH  branch     │
│              │  survived … Catelyn was already dead.      │                     │
│              │  (░░ = highlighted contradiction spans)    │  [Apply fix ✓]      │
└──────────────┴───────────────────────────────────────────┴─────────────────────┘
```

### 11.1 Left panel — Story Bible

- Collapsible sections: Characters, Objects, Locations, Factions, World Rules, Timeline, Branches.
- Each entity row shows name + a one-line state badge (e.g. Jaime → "right hand lost").
- **Timeline section (must-have):** horizontal or vertical track with events in `order`, branch fork visible, **"you are here" marker** tied to `SceneContext.resolvedPosition`, facts/events **not yet in force greyed/dimmed**. This makes narrative-order-vs-chronology visible, not just asserted.
- Branches section: `main → branch_robb_lives / branch_canon`, each selectable to preview which facts are in force.
- A **Graph** toggle (nice-to-have only) swaps the panel for a React Flow graph — build only if time remains after timeline viz + ingestion.

### 11.2 Center panel — Scene Editor

- Editor: **TipTap** (ProseMirror under the hood) — robust span decorations and stable positions. (Decision locked; see Frontend Architecture.)
- Top of editor: **Scene Context bar — editable chips** (not a bare dropdown):
  - **Presentation/position chip:** `Main timeline` · `Flashback (before …)` · `Flash-forward (after …)` · `Unknown`. Anchor event appears as a sub-chip when flashback/forward is selected.
  - **Branch chip:** `– (main)` · `Branch A` · `Branch B` (GoT: `branch_robb_lives` / `branch_canon`).
  - **Hybrid inference (B1):** the claim-extraction call also returns `inferredContext`. Pre-fill chips when the user hasn't set them. Chips show **confirmed** (user-edited or accepted) vs **unconfirmed** (AI-inferred default) styling — e.g. dashed border + ○ for unconfirmed.
  - **Defaults:** no timing signal in prose → silently default to `Main timeline / now` as an **unconfirmed** chip; **no modal prompt**.
  - **Conflict only:** if inference detects conflicting signals (e.g. flashback language + main-timeline branch claim), show a lightweight inline prompt: *"Scene looks like a flashback before X — use that context?"*
  - **Source of truth:** user chip edits always override inference. One `SceneContext` per scene/draft for MVP.
  - **Demo beats:** the flashback suppression beat is driven by a **manual chip flip** on stage; inference is the bonus *"it figured this out"* moment on a cue-heavy scene.
- Highlights: contradiction spans get a colored underline/background keyed to severity (high = red/amber, medium = amber, low = blue). Hovering shows a tooltip with the issue title; clicking selects the issue (syncs with right panel).
- A **Check Continuity** action (top bar button + optional debounced auto-check while typing, debounce ~1200ms, cancellable).
- Subtle "checking…" state on the editor border, never a blocking spinner.

### 11.3 Right panel — Continuity Issues

- **Issue list:** cards sorted by severity then document order. Each card: severity dot, issue-type label, short title, and the offending phrase. Status chips: open / ignored / intentional / resolved (ignored & resolved render dimmed/struck).
- **Selected-issue detail** (expands inline or pins to bottom): full explanation, **evidence quote** (rendered as a blockquote with source reference, e.g. "Canon Fact #1"), list of conflicting facts, and **suggested fixes** as clickable options.
- **Actions per issue:**
  - **Apply fix** → repair verify-loop agent proposes replacement → re-checks patched text → confirms no new contradiction → replaces span, sets status `resolved`, removes highlight. Show subtle "verified ✓" on success.
  - **Ignore** → status `ignored`, dims the card, removes highlight.
  - **Mark intentional** → status `intentional`, dims, removes highlight, (stretch) writes a note so future checks don't re-flag.
  - **Update canon** → opens a small form pre-filled to add/modify a `CanonFact` from the scene's claim (e.g. "Jaime's hand was restored by magic" as a new fact with a validity start). MVP can stub this to "added to canon" toast + in-memory append.

### 11.4 Visual design notes

- Dark, focused, editorial. Think Linear/Things meets a writing app, not Slack.
- Typographic editor (serif body for prose is acceptable and feels "writerly"; UI chrome in a clean sans).
- Severity colors are the only loud thing; everything else is restrained.
- No emoji, no chat avatars, no "Hi! I'm your AI assistant" copy. The voice is a tool, not a buddy.
- Empty/zero-issue state is a *positive* signal: a calm "No continuity issues found for this scene context" — important for the flashback beat.

---

## 12. Core Features

| Feature | Tier | Notes |
|---|---|---|
| Three-panel editor shell | Must | The frame everything lives in. |
| Preloaded GoT demo world | Must | `seed/world.ts` (≤8 facts; see §10.10 for reference skeleton); Moonstone fallback in `seed/world-moonstone.ts`. |
| **Canon ingestion + file upload** | **Must** | `.txt`/`.md`/`.docx`; `.pdf` nice-to-have. Canon-builder agent. Pre-cache for stage. |
| Story bible panel | Must | Renders entities, rules, timeline, branches from store. |
| Live scene editor (TipTap) | Must | Holds draft + decorations. |
| **Hybrid scene context chips** | Must | Manual + AI-inferred; chips are source of truth. |
| Continuity check endpoint | Must | `POST /api/check` → 2-call hot path (extract+infer → detect). |
| Repair verify-loop agent | Must | Apply fix → re-check → confirm. |
| Inline highlights | Must | Span decorations mapped from issue offsets. |
| Issue cards + detail | Must | Severity-sorted; evidence + source + fixes. |
| Suggested fixes (apply) | Must | Text replacement via repair agent. |
| Branch awareness | Must | Branch filter on facts; branch-type issues. |
| Timeline/validity awareness | Must | Validity windows filter facts by scene position. |
| **Timeline visualization** | **Must** | "You are here" marker + greyed not-yet-in-force facts. (Aligned with §6 and §11.1.) |
| Issue status lifecycle | Should | open/ignored/intentional/resolved, in-memory. |
| Story-bible dashboard polish | Should | Counts, grouping, entity badges. |
| Context inference UX | Should | Unconfirmed chips; conflict prompt only. |
| **Arize tracing** | **Must** | Real spans; show before/after prompt improvement. |
| **Redis retrieval + agent memory** | **Must** | Vector search over canon; canon-builder working memory. |
| Relationship graph (React Flow) | Nice | Build only if time remains. |
| `.pdf` upload | Nice | Deferred format. |
| Browser-extension stub | Nice | Calls same `/api/check`. |
| Export story bible | Nice | Dump store to JSON/Markdown. |

---

## 13. Contradiction Types

A fixed taxonomy. The model is told to classify every issue into exactly one `issueType`. This keeps output structured and the UI predictable.

| issueType | Definition | Demo example |
|---|---|---|
| `world_rule` | Violates a stated rule of the world (magic, physics, tech limits). | Dragons over King's Landing before any were hatched. |
| `travel_time` | Distance/duration inconsistent with established geography. (Subtype of world rule; broken out because it demos well.) | Winterfell to King's Landing in one day. |
| `character_state` | Contradicts a character's physical/status state (alive/dead/injured/transformed/location). | Jaime uses both hands after losing one. |
| `object_state` | Object's location/owner/condition contradicts canon. | Using the moonstone while it's in the vault. |
| `relationship` | Relationship type/timing contradicts canon. | Mira & Kael "childhood friends" vs enemies-until-treaty. |
| `faction_state` | Faction status (war/alliance/destroyed) contradicts canon. | A destroyed faction shown intact. |
| `knowledge_state` | A character knows/reveals something they shouldn't yet know (or believes something false as true). | Elira referencing the king as her father pre-coronation. |
| `timeline` | Events out of in-universe order, or a fact referenced before it's true. | An event referenced before it happens. |
| `branch` | Claim inconsistent with the selected branch's facts. | Robb-lives branch + Catelyn already dead in hall. |

**Severity scale:** `high` (hard contradiction, breaks the world) · `medium` (likely contradiction, depends on reading) · `low` (soft / stylistic / ambiguous). Always phrase as **"possible contradiction"** in UI copy — never "error."

**Knowledge-state nuance (important for not over-flagging):** a fact can be *objectively true* but *not known* to a character. The narration can state objective truth; a *character's dialogue/thought* asserting hidden knowledge is the contradiction. The MVP handles this minimally via the fact's `epistemicStatus` field (objective / character_believed / public / hidden) and a light prompt instruction. Don't overbuild this — it's one demo beat (the coronation fact), and it's acceptable for the MVP to treat it as a `knowledge_state` issue only when a character explicitly asserts the hidden fact.

---

## 14. Timeline and Branch Handling

The headline differentiator: **narrative order ≠ world chronology.** Keep the model simple; do the time logic in code.

### 14.1 The model

- Every `TimelineEvent` has an integer `order` (in-universe sequence).
- Every `CanonFact` optionally has `validityStartEventId` and `validityEndEventId`. Semantics: the fact is *in force* for any chronological position `p` where `order(start) <= p < order(end)`. `null` start = "from the beginning"; `null` end = "forever after".
- A `SceneContext` resolves to a **chronological position** `p`:
  - `Main timeline` → `p = +∞` (the present "now"; all past facts are in force). *(Opinionated default: a main-timeline scene is the latest point, so every established fact applies. Good enough for the demo.)*
  - `Flashback (before evt_X)` → `p = order(evt_X) - ε` (just before that event).
  - `Flash-forward (after evt_X)` → `p = order(evt_X) + ε`.
  - `Unknown` → `p = +∞` but mark facts as "soft" (the model is told the timing is uncertain; downgrade timeline-only contradictions to `low`).

### 14.2 Fact filtering by position (the false-positive killer)

Before contradiction detection, filter canon facts to those **in force at `p`**:

```ts
function isFactInForce(fact: CanonFact, p: number, events: TimelineEvent[]): boolean {
  const start = fact.validityStartEventId ? orderOf(fact.validityStartEventId, events) : -Infinity;
  const end   = fact.validityEndEventId   ? orderOf(fact.validityEndEventId, events)   : +Infinity;
  return p >= start && p < end;
}
```

Daren's "lost hand" fact has `validityStartEventId = evt_siege_veyr`. A flashback positioned before `evt_siege_veyr` has `p < order(evt_siege_veyr)`, so the fact is filtered out and the "both hands" claim has nothing to contradict. **The model never even sees the conflicting fact** — cheap, robust, no fragile temporal reasoning in the prompt. *(GoT demo: Jaime's lost-hand fact + `evt_jaime_captured` — same mechanism.)*

For relationship facts with a *transition* (enemies → allies at the Treaty), model as **two facts**: one valid `[−∞, evt_treaty_thorns)` ("enemies") and one valid `[evt_treaty_thorns, +∞)` ("allied/at peace"). A scene's position selects which is in force. The "childhood friendship" claim contradicts the enemies fact at any post-treaty position too (they were never friends), so it still fires on Main timeline — correct.

### 14.3 Branch model

- A `Branch` has `id`, `name`, `parentBranchId` (null for `main`).
- A `CanonFact` has `branchId` (null = applies to all branches / lives on main).
- A fact applies to a scene's branch `b` if `fact.branchId == null` OR `fact.branchId == b` OR `fact.branchId` is an **ancestor** of `b`.
- Keep branches **flat off main** for the MVP (`branch_robb_lives`, `branch_canon` both parent = `main`). No nested branches, no merge logic.
- Branch contradiction: prose names an alternate timeline inline (*"in the branch where Robb survived…"*) or the branch chip selects one. **Per-claim branch scoping** (§14.5) filters facts for that claim — so the Robb-lives + dead-Catelyn contradiction fires on Main timeline when the draft names the branch.

**Do not overengineer.** No interval trees, no temporal logic solver, no branch merge. Integer ordering + two nullable event refs + a branch id is the entire mechanism.

### 14.4 Hybrid scene context (B1)

**Principle:** inference assists; chips decide.

1. **Claim extraction** (fast model) returns `claims[]` **and** `inferredContext`:
   ```ts
   interface InferredContext {
     presentation: PresentationType;
     anchorEventId?: ID | null;
     branchId?: ID | null;
     confidence: number;       // 0..1
     signals?: string[];       // e.g. ["past-perfect verbs", "before the wedding"]
     conflict: boolean;        // true if prose sends mixed timing/branch signals
   }
   ```
2. **Pre-fill rule:** if the user has not confirmed context chips, apply `inferredContext` to the chip UI. Mark chips **unconfirmed** (dashed/○) until the user edits or clicks confirm.
3. **Default:** no timing/branch signal → `presentation: "main"`, `branchId: null`, `confidence: low`, **unconfirmed** — no modal.
4. **Conflict:** `inferredContext.conflict === true` → show inline prompt; user pick sets confirmed chips.
5. **Check pipeline:** pass **confirmed** `SceneContext` to `resolveContext` + `filterFacts`. If only unconfirmed chips exist, use inferred values but keep unconfirmed styling. User edits always win.
6. **Tracing:** emit an Arize span `ai.context.infer` alongside `ai.claims.extract` (same LLM call or nested span).

**One context per scene/draft for MVP** — no per-paragraph context switching.

### 14.5 Per-claim branch scoping

When a claim carries `impliedBranchId` (prose names a branch) **or** the scene branch differs from main, run contradiction detection against facts filtered for **that claim's effective branch**:

```ts
const branchForClaim = claim.impliedBranchId ?? sceneContext.branchId;
const factsForClaim = filterFacts(allFacts, position, branchForClaim);
```

This is what makes the GoT branch issue fire on Main timeline when the draft says *"in the branch where Robb survived…"*

**Branch name resolution:** the model returns `impliedBranch` as a free string (e.g. `"branch where Robb survived"` or `"the Robb-lives timeline"`). The server resolves it to a `Branch.id` by case-insensitive substring match against `branch.name` and `branch.description` fields of all branches in the project. First match wins. No match → `impliedBranchId: null` (treat as scene-level branch, no per-claim scoping). For the GoT seed, `"Robb survived"` matches `BRANCH_ROBB_LIVES.description` ("Alternate: Robb and Catelyn survive the Twins"). Add `branch.aliases?: string[]` to the `Branch` interface if richer matching is needed later.

---

## 15. Data Model

TypeScript interfaces. These are the contract for both the store and the API. Put them in `lib/types.ts`. They use general primitives; fiction-specific values live in string-literal unions that are easy to extend.

```ts
// ---------- General primitives ----------

export type ID = string;

export type EntityType =
  | "character" | "location" | "faction" | "object" | "event" | "rule";

export type EpistemicStatus =
  | "objective"          // true in the world
  | "character_believed" // a character believes it (may be false)
  | "public"             // commonly known in-world
  | "hidden";            // a secret; not yet known to some/all

export type FactType =
  | "world_rule" | "character_state" | "object_state"
  | "relationship" | "faction_state" | "knowledge_state"
  | "timeline" | "branch_state";

export type IssueType =
  | "world_rule" | "travel_time" | "character_state" | "object_state"
  | "relationship" | "faction_state" | "knowledge_state"
  | "timeline" | "branch";

export type Severity = "high" | "medium" | "low";

export type IssueStatus = "open" | "ignored" | "intentional" | "resolved";

export type PresentationType =
  | "main" | "flashback" | "flashforward" | "unknown";

// ---------- Project ----------

export interface Project {
  id: ID;
  name: string;            // "Game of Thrones (Demo)"
  description?: string;
  createdAt: string;
  // everything below is scoped to a project
}

// ---------- Sources ----------

export interface CanonSource {
  id: ID;
  projectId: ID;
  title: string;           // "Book 1, Chapter 7" or "World Bible v2"
  kind: "manuscript" | "notes" | "wiki" | "import" | "seed";
  text: string;            // raw canon text this source contributed
  createdAt: string;
}

// ---------- Entities ----------

export interface Entity {
  id: ID;
  projectId: ID;
  name: string;            // "Elira"
  type: EntityType;
  aliases?: string[];      // ["the mage", "heir of the moon"]
  summary?: string;        // one-line state for the bible panel
  attributes?: Record<string, string>; // freeform, e.g. { role: "mage" }
}

// ---------- Timeline ----------

export interface TimelineEvent {
  id: ID;
  projectId: ID;
  name: string;            // "Siege of Veyr"
  order: number;           // in-universe sequence (integer)
  branchId?: ID | null;    // null = on the main spine
  summary?: string;
}

// ---------- Branches ----------

export interface Branch {
  id: ID;
  projectId: ID;
  name: string;            // "Branch A — Mira survives"
  parentBranchId: ID | null; // null for the root ("main")
  description?: string;
}

// ---------- Canon facts ----------

export interface CanonFact {
  id: ID;
  projectId: ID;
  text: string;                       // human-readable fact
  factType: FactType;
  entityIds: ID[];                    // entities this fact concerns
  sourceId: ID | null;                // which CanonSource it came from
  sourceQuote: string;                // exact supporting quote from source
  confidence: number;                 // 0..1, model or human assigned
  branchId: ID | null;                // null = all branches
  validityStartEventId: ID | null;    // fact in force from this event
  validityEndEventId: ID | null;      // ...until this event (exclusive)
  epistemicStatus: EpistemicStatus;   // objective / believed / public / hidden
  // who, if anyone, the epistemic status is relative to (for hidden/believed)
  epistemicSubjectId?: ID | null;
}

// ---------- Scene draft + context ----------

export interface SceneContext {
  presentation: PresentationType;     // main / flashback / flashforward / unknown
  anchorEventId?: ID | null;          // for flashback/forward: relative to this event
  branchId: ID | null;                // null = main
  // resolved chronological position, computed in code (not user-set)
  resolvedPosition?: number;          // +Infinity for main; order±ε otherwise
  // hybrid context (B1)
  confirmed: boolean;                 // user has set/accepted chips; false = AI-inferred default
  inferred?: InferredContext | null;  // latest inference from claim extraction
}

export interface InferredContext {
  presentation: PresentationType;
  anchorEventId?: ID | null;
  branchId?: ID | null;
  confidence: number;
  signals?: string[];
  conflict: boolean;
}

export interface SceneDraft {
  id: ID;
  projectId: ID;
  text: string;                       // the prose being written
  context: SceneContext;
  updatedAt: string;
}

// ---------- Claims (extracted from a scene) ----------

export type ClaimType = FactType;     // claims are assertions of the same kinds

export interface Claim {
  id: ID;
  claimText: string;                  // normalized assertion: "Elira casts magic"
  claimType: ClaimType;
  entityIds: ID[];                    // entities referenced (resolved if possible)
  entityMentions: string[];           // raw mentions before resolution
  sourceSpan: { start: number; end: number; quote: string }; // span in scene text
  impliedBranchId?: ID | null;        // if the prose names a branch
  impliedPosition?: number | null;    // if the prose implies timing
  confidence: number;                 // 0..1
}

// ---------- Suggested fixes ----------

export interface SuggestedFix {
  id: ID;
  label: string;                      // short button label, e.g. "Remove the spell"
  description: string;                // what this fix does + why it's consistent
  // a concrete text edit applied to the scene span:
  replacement: string;                // text to put in place of the span
  // optional alternative: instead of editing prose, change canon
  canonUpdate?: Partial<CanonFact> | null;
  preservesVoice: boolean;            // true if it's a light touch
}

// ---------- Continuity issues ----------

export interface ContinuityIssue {
  id: ID;
  projectId: ID;
  sceneDraftId: ID;
  issueType: IssueType;
  severity: Severity;
  highlightedText: string;            // the offending phrase as it appears
  span: { start: number; end: number }; // offsets in scene text (for decoration)
  explanation: string;                // plain-English "possible contradiction"
  evidenceQuotes: string[];           // quotes from canon sources
  conflictingFactIds: ID[];           // CanonFact ids this claim conflicts with
  claimId?: ID | null;                // the claim that triggered it
  suggestedFixes: SuggestedFix[];
  status: IssueStatus;                // default "open"
  confidence: number;                 // 0..1
}
```

**Notes on choices:**

- Spans are character offsets into the scene text. With TipTap you map these to ProseMirror positions; storing plain text offsets keeps the engine editor-agnostic (a browser extension sends a plain string + offsets too).
- `confidence` everywhere lets the UI dim low-confidence issues and lets you tune a display threshold (e.g. hide < 0.4) without code changes.
- `epistemicStatus` + `epistemicSubjectId` carry the knowledge-state model without a separate table.
- Relationship transitions are modeled as two time-bounded facts, not a state machine.

### 15.1 Persistence

- **MVP:** in-memory store seeded from `seed/world.ts` (GoT), held in a singleton on the server (and/or Zustand on the client). No database. Mutations (status changes, canon updates, ingested canon) live for the session.
- **Redis (required for sponsor integration):** canon facts + embeddings for vector retrieval; canon-builder agent working memory; session state; check-result cache. See Retrieval Strategy (§20). Implement `RedisRetriever`/`redisStore` — not optional for the hackathon build plan.
- **Do not** stand up Postgres/Prisma for the hackathon unless scope explodes (it won't for ≤8 facts + ingestion demo).


---

## 16. API Design

All routes are Next.js App Router route handlers under `app/api/`. JSON in, JSON out. The contradiction logic lives in `lib/engine/` and is callable without HTTP (so the engine is reusable). Every external write surface (web app, extension, future Docs add-on) calls these same endpoints.

### 16.1 Endpoints

```
GET    /api/project                 -> Project + full canon (entities, facts, events, branches)
POST   /api/check                   -> run continuity check on a scene  [CORE — 2-call hot path]
POST   /api/ingest                  -> raw canon text / file -> structured canon  [CORE]
POST   /api/repair                  -> repair verify-loop: propose fix, re-check, confirm  [CORE]
POST   /api/extract-claims          -> claims + inferredContext only (debug)   [optional split]
PATCH  /api/issue/:id               -> update issue status (ignore/intentional/resolved)
POST   /api/canon/fact              -> add/update a CanonFact (the "Update canon" action)
GET    /api/export                  -> dump story bible as JSON/Markdown  [nice-to-have]
```

### 16.2 `POST /api/check` — the core endpoint

**Request**
```jsonc
{
  "projectId": "proj_got_demo",
  "sceneText": "Jaime tightened the straps on both gauntlets before drawing his sword...",
  "context": {
    "presentation": "main",
    "anchorEventId": null,
    "branchId": null,
    "confirmed": true
                 // null=main | "branch_robb_lives" | "branch_canon"
  }
}
```

**Server pipeline (in `lib/engine/checkScene.ts`)**
```
1. Load project canon (entities, facts, events, branches) from store.
2. extractClaims(sceneText, contextHint)                      // LLM call #1 — fast model
   → claims[] + inferredContext (pre-fill chips if unconfirmed)
3. Resolve final SceneContext from user chips (override inference).
4. context.resolvedPosition = resolveContext(presentation, anchorEventId).
5. candidateFacts = facts.filter(inForceAt(position) && inBranch(branchId))
   (+ per-claim branch scoping for claims with impliedBranchId — §14.5)
6. (optional) narrow candidateFacts by entity overlap with claims
7. detectContradictions(claims, candidateFacts, context)    // LLM call #2 — strongest + extended thinking
8. map issue.highlightedText -> span offsets in sceneText (fuzzy match if needed)
9. attach suggestedFixes (inline from #7 or lazy via repair agent)
10. return issues + inferredContext + claims
```

**Response**
```jsonc
{
  "issues": [ /* ContinuityIssue[] — see schema §19 */ ],
  "claims": [ /* Claim[] (optional, for debugging) */ ],
  "inferredContext": { /* InferredContext — pre-fills chips if unconfirmed */ },
  "meta": { "factsConsidered": 6, "factsFiltered": 2, "latencyMs": 2400 }
}
```

**Design decisions:**
- **Two LLM calls on the hot path** (extract+infer → detect), not one agentic loop — keeps live checks fast (~3–8s). Each prompt is small and focused; Arize traces stay legible (named spans per step).
- **Context inference rides on call #1** — same fast-model call extracts claims *and* `inferredContext`. Second traceable AI step for Arize without a third round-trip.
- **Contradiction detection only** gets extended thinking + strongest model — this is the reasoning step; accuracy here is the product.
- **Per-claim branch scoping in the detection call:** run `detectContradictions` **once** with all claims (not in a per-claim loop). For claims with `impliedBranchId` set, include only `filterFacts(allFacts, position, claim.impliedBranchId)` in that claim's labeled block in the detection prompt. Claims without `impliedBranchId` receive the scene-level filtered facts. Pass each claim's applicable fact subset as a labeled section (e.g. `CLAIM [id] (branch: branch_robb_lives) / FACTS FOR THIS CLAIM: ...`).
- **Span mapping in code, not the model.** Ask the model to return the exact offending substring (`highlightedText`); locate it in `sceneText` server-side (`indexOf`, then a fuzzy fallback). Don't trust the model to count character offsets.
- **Apply fix** goes through `POST /api/repair` (repair verify-loop agent), not a blind text swap.
- **Idempotent + stateless** except for the store read. No session needed to run a check.

### 16.3 `POST /api/ingest` (core)

Accepts **paste text** or **multipart file upload** (`.txt`, `.md`, `.docx`). Parses file to plain text server-side (`mammoth` or similar for `.docx`).

```jsonc
// req (JSON paste)
{ "projectId": "proj_got_demo", "title": "Canon notes", "text": "<raw canon>" }
// req (multipart)
// file: canon.docx | fields: projectId, title

// res
{ "entities": [...], "facts": [...], "events": [...], "branches": [...], "sourceId": "src_..." }
```

Runs the **canon-builder agent** (§17.5): tool-using loop with `add_entity`, `add_fact`, `add_event`, `add_branch`, `search_existing_canon`. Agent self-reviews validity windows and branch tags before commit. Stores facts in Redis (embeddings for retrieval). UI appends to bible.

**Stage rule:** never cold-ingest on demo. Use pre-cached ingestion output (§10.9).

### 16.4 `POST /api/repair` (core)

```jsonc
// req
{
  "projectId": "proj_got_demo",
  "sceneText": "...",
  "context": { /* SceneContext */ },
  "issueId": "iss_...",
  "fixId": "fix_..."          // or inline fix payload
}
// res
{
  "patchedText": "...",
  "verified": true,           // re-check found no contradiction on the patched span
  "remainingIssues": [ ... ]  // optional full re-check summary
}
```

Repair verify-loop agent (§17.5): propose replacement → run hot-path re-check on patched text → confirm no new contradiction → return. Fast model for propose + verify; do not use extended thinking here.

### 16.5 `PATCH /api/issue/:id`

```jsonc
// req
{ "status": "intentional" }   // open | ignored | intentional | resolved
// res
{ "issue": { /* updated ContinuityIssue */ } }
```

**MVP persistence rule:** Issues live in **client Zustand only** after `POST /api/check` returns. Status changes (`setIssueStatus`) are pure Zustand mutations — no HTTP call is made. Keep this route as a **no-op stub** (returns 200 with the mutated issue, but does not write to any server store) or drop it entirely for MVP. Issues reset on page refresh — acceptable for a demo. Do not wire this to the server in-memory singleton. With Redis (`session:{id}:issues` — §20.2), this route can be promoted to a real server call for the ship target.

### 16.6 Error contract

Every endpoint returns `{ "error": { "code": string, "message": string } }` with an appropriate status. On LLM/JSON-parse failure, `/api/check` returns `502` with `code: "llm_parse_error"` and the client falls back to canned demo issues (see Risks). Never throw an unhandled error into the demo.

---

## 17. AI System Design

Continuum uses Claude in two modes: a **fast 2-call hot path** for live contradiction checks, and **two real agents** for ingestion and fix verification. Everything is structured extraction / classification / minimal repair — never freeform story generation. Use **tool-use / structured outputs** + **Zod** validation everywhere.

**Built with Claude Code** — lean into Anthropic's ambition / "shift what's possible" track in the pitch: structured state + long-horizon reasoning over evolving canon is exactly what agent memory needs.

### 17.1 Model routing (explicit)

Keep all model ids in `lib/ai/models.ts`. Route by task:

| Task | Model tier | Extended thinking | Notes |
|---|---|---|---|
| Claim extraction + context inference | **Fast** (Haiku class) | Off | Call #1 on hot path; also emits `inferredContext` |
| Contradiction detection | **Strongest** (Sonnet/Opus class) | **On** | Call #2 on hot path; the product |
| Fix proposal + verify re-check | **Fast** | Off | Repair verify-loop agent |
| Canon-builder agent | **Mid/strong + tool use** | Off (loop budget) | Powers ingestion; latency-tolerant |

Do **not** make the live check agentic — two bounded calls, hard timeout, cacheable.

### 17.2 Hot path vs agents

```
HOT PATH (live check — NOT agentic):
  extractClaims + inferContext  →  filterFacts  →  detectContradictions
  2 LLM calls, ~3–8s target

AGENT 1 — Canon-builder (ingestion):
  tool loop: add_entity | add_fact | add_event | add_branch | search_existing_canon
  self-review validity windows + branches → commit to store + Redis embeddings

AGENT 2 — Repair verify-loop (apply fix):
  propose replacement → re-run hot-path check on patched text → confirm clean → present
```

### 17.3 Why structured outputs / tool use

Force JSON via tool `input_schema` (from Zod via `zod-to-json-schema`). One repair retry on validation failure, then fallback. Never crash the demo.

### 17.4 Traceable pipeline (Arize — required)

Wrap every step in `lib/trace` spans exported to **Arize**. Minimum spans:

```
ai.claims.extract       // claims + inferredContext
ai.context.infer        // nested or same span as extract
ai.issues.detect        // contradiction detection (+ thinking trace if available)
ai.repair.propose       // repair agent fix proposal
ai.repair.verify        // re-check pass/fail
ai.canon.builder        // canon-builder agent loop (per tool call sub-span)
```

**Demo narrative:** show a trace where over-flagging was observed → prompt tightened → before/after comparison on the GoT draft. This is a real improvement story, not a screenshot of generic latency.

**Recipe (fill in after M3/M4 produce real traces):** The specific over-flagging case, the baseline prompt, and the tightened change cannot be fully specified before the pipeline runs on real inputs. At M4: (1) run the GoT demo draft through the detection call with **no few-shot examples**; (2) identify which claim(s) fire spuriously (likely: travel-time claim on "first light to sunset" mis-classifies as two separate issues, or a branch claim fires on main timeline); (3) tighten the detection prompt — typically: add one conservative instruction ("only flag claims the provided facts actually contradict") or one GoT few-shot; (4) record both trace runs in Arize; (5) save versions as `lib/ai/prompts/detect-v1.ts` and `detect-v2.ts`. The before/after story is then: *"Arize showed [specific issue] over-flagging — prompt change [specific line] removed it — here's the diff."*

### 17.5 Agent specs

#### Canon-builder agent (`lib/agents/canonBuilder.ts`)

- **Powers:** `POST /api/ingest` (paste + file upload).
- **Model:** mid/strong with tool use; max ~8–12 tool turns.
- **Tools:**
  - `add_entity(name, type, aliases?, summary?)`
  - `add_fact(text, factType, entities, sourceQuote, validityStart?, validityEnd?, branch?, epistemicStatus?)`
  - `add_event(name, orderHint, summary?)`
  - `add_branch(name, parentBranch?, description?)`
  - `search_existing_canon(query)` — hits **Redis vector index** over committed facts (dedupe + consistency)
- **Loop:** read chunk → extract → tool calls → **self-review** ("Are validity windows correct? Branch tags consistent? Duplicates?") → commit batch.
- **Memory:** working notes + partial canon in **Redis** (`agent:canon:{sessionId}:*`) so the agent doesn't re-derive entities across turns.
- **Output:** structured entities/facts/events/branches appended to project store; embeddings written for retrieval.

#### Repair verify-loop agent (`lib/agents/repairVerify.ts`)

- **Powers:** `POST /api/repair` and the **Apply fix** button.
- **Model:** fast for propose + verify.
- **Loop:**
  1. Take issue + selected fix (or generate minimal replacement).
  2. Patch the scene span.
  3. Re-run **hot-path** `checkScene` on patched text (can scope to nearby claims for speed).
  4. If the original contradiction is gone **and** no new high-severity issues on the patch → `verified: true`.
  5. Else try one alternate minimal fix or return `verified: false` with explanation.
- **UI:** show "verified ✓" chip when step 4 passes; never silently apply an unverified patch on demo path.

### 17.6 Determinism for the demo

- Temperature ≈0.2 on extraction and detection.
- Cache check results keyed by `hash(sceneText + context)`.
- **Pre-warm** GoT demo draft + **pre-cache ingestion output** on app load.
- Never cold-ingest or cold-check untested input on stage.

---

## 18. Prompt Design

Prompts live in `lib/ai/prompts/` as template functions. All include: the task, the strict output contract, and few-shot guidance drawn from the demo world. Below are ready-to-use templates — fill the `${}` slots.

### 18.1 Canon-builder agent prompt (replaces one-shot extraction)

**System:**
```
You are Continuum's canon-builder agent. You convert raw fictional/TV-world text
into structured canon by calling tools. Extract only what the text states or
strongly implies. Never invent facts. Preserve exact supporting quotes in
sourceQuote fields.

Before each commit batch, self-review: Are validity windows correct? Are branch
tags consistent? Any duplicate entities or facts? Call search_existing_canon
before adding near-duplicates.

Entity types: character | location | faction | object | event | rule.
Fact types: world_rule | character_state | object_state | relationship |
faction_state | knowledge_state | timeline | branch_state.
Mark epistemicStatus on each fact. Model relationship transitions as separate
time-bounded facts when timing changes.
```
**User:** `SOURCE TITLE: ${title}\n\nTEXT:\n"""\n${rawCanonText}\n"""\n\nBuild canon via tools. Review before final commit.`

*(The one-shot `emit_canon` prompt below remains useful for tests/fallback — prefer the agent for production ingest.)*

### 18.1b One-shot canon extraction prompt (fallback / tests)

**System:**
```
You are Continuum's canon extractor. You convert raw fictional/game-world text
into structured canon. You extract only what the text states or strongly implies.
You never invent facts. You preserve exact supporting quotes.

Output ONLY by calling the `emit_canon` tool with valid JSON. No prose.

Entity types: character | location | faction | object | event | rule.
Fact types: world_rule | character_state | object_state | relationship |
faction_state | knowledge_state | timeline | branch_state.
For each fact, capture: text (a clear standalone statement), factType, the
entities involved (by name), an exact sourceQuote from the input, a confidence
0..1, and — IF the text indicates timing — a validity window described in plain
words (e.g. "after the Siege of Veyr"). If the text mentions branches/alternate
outcomes, emit branches and tag branch-specific facts.
Mark each fact's epistemicStatus: objective (true in world) | character_believed
| public | hidden (a secret not yet known to someone).
```

**User:**
```
SOURCE TITLE: ${title}

TEXT:
"""
${rawCanonText}
"""

Extract entities, canon facts, timeline events (with relative order if stated),
and any branches. Call emit_canon.
```

### 18.2 Claim extraction + context inference prompt

**System:**
```
You are Continuum's claim extractor. Given a NEW scene and optional context hint,
list the concrete factual claims the scene asserts about the world. Also infer
scene context: presentation (main|flashback|flashforward|unknown), anchor event
(if flashback/forward), branch (if prose names an alternate timeline), confidence
0..1, and whether timing/branch signals CONFLICT.

For each claim: claimText, claimType, entity names, EXACT scene substring (quote),
impliedBranch if prose names one, confidence. Do NOT evaluate consistency.

Context inference rules:
- No clear timing signal → presentation=main, confidence≤0.4, conflict=false.
- Mixed signals (e.g. flashback grammar + present-tense main action) → conflict=true.
- Do NOT guess anchor events not supported by prose or the known timeline list.

Output ONLY via `emit_claims` (claims + inferredContext). Do NOT evaluate consistency.
```

**User:**
```
SCENE CONTEXT: presentation=${presentation}${anchorClause}${branchClause}

SCENE TEXT:
"""
${sceneText}
"""

Known entity names (resolve mentions to these when possible):
${entityNameList}

Extract claims. Call emit_claims.
```
where `anchorClause` is e.g. ` (flashback before "Jaime's capture")` and `branchClause` is e.g. ` branch="branch_robb_lives"`.

### 18.3 Contradiction detection prompt (the important one)

**System:**
```
You are Continuum's continuity checker for fictional and game worlds. You are
given (1) a list of CLAIMS extracted from a new scene, (2) the CANON FACTS that
are in force for this scene's chronological position and branch, and (3) the
scene context. Decide which claims CONTRADICT canon.

Rules:
- Only the facts provided are in force. Do not assume other facts.
- A contradiction is a claim that cannot be true given the in-force facts.
- Respect the scene context. The facts given are already time/branch filtered;
  if a claim conflicts with none of them, it is consistent.
- Distinguish objective truth from character knowledge: narration may state
  objective facts; a contradiction in knowledge_state occurs when a CHARACTER
  asserts/acts on a fact marked hidden-from-them.
- Phrase everything as a POSSIBLE contradiction. Writers break canon on purpose.
- For each contradiction: classify issueType (world_rule|travel_time|
  character_state|object_state|relationship|faction_state|knowledge_state|
  timeline|branch), set severity (high|medium|low), write a one-paragraph plain
  explanation, include the exact offending substring (highlightedText, verbatim
  from the scene), cite the conflicting fact ids and an evidenceQuote from canon,
  and propose 1–3 suggestedFixes. A fix is a minimal edit to the scene text that
  preserves the writer's voice (give the replacement substring) OR a canon update.
- Be precise and conservative: do not flag things the in-force facts do not
  actually contradict.

Output ONLY via the `emit_issues` tool.
```

**User:**
```
SCENE CONTEXT: presentation=${presentation}${anchorClause}${branchClause}

IN-FORCE CANON FACTS:
${factsBlock}   // each: [factId] (factType, epistemicStatus) "text"  | evidence: "sourceQuote"

CLAIMS FROM THE SCENE:
${claimsBlock}  // each: [claimId] (claimType) "claimText"  | scene quote: "..."

For each claim that contradicts the in-force facts, emit an issue. Call emit_issues.
```

### 18.4 Fix generation prompt (optional / lazy)

**System:**
```
You repair a single continuity contradiction in a fictional scene with the
LIGHTEST possible touch. You preserve the writer's voice, tone, and sentence
rhythm. You change only what is necessary to remove the contradiction. You may
also offer a "change canon instead" option. Output ONLY via `emit_fixes`.
```
**User:**
```
SCENE EXCERPT: "${spanContext}"     // sentence(s) around the issue
OFFENDING PHRASE: "${highlightedText}"
WHY IT CONTRADICTS: ${explanation}
CONFLICTING CANON: ${evidenceQuote}

Propose 1–3 minimal fixes. For each: a short label, a one-line description, and
the exact replacement text for the offending phrase. Mark preservesVoice. Call emit_fixes.
```

### 18.4b Repair verify-loop — orchestration (not a standalone prompt)

The repair verify-loop (`lib/agents/repairVerify.ts`) orchestrates existing pipeline calls; the only LLM call is the fallback fix-generation step (§18.4):

1. **Input:** `{ issue: ContinuityIssue, fixId: ID | null, sceneText: string, context: SceneContext }`.
2. **If `fixId` given:** look up `issue.suggestedFixes.find(f => f.id === fixId)` → use `fix.replacement`. No LLM call.
3. **If no `fixId`:** call `generateFixes` (§18.4 prompt) on `issue.highlightedText` → pick the first `preservesVoice: true` fix.
4. **Apply patch:** `patchedText = sceneText.slice(0, issue.span.start) + replacement + sceneText.slice(issue.span.end)`.
5. **Re-verify:** call `checkScene(patchedText, context, store, retriever, ai)` scoped to claims overlapping the original span. Assert: (a) original `issue.issueType` no longer present at that span; (b) no new `high`-severity issues introduced by the patch.
6. **If clean:** return `{ patchedText, verified: true }`.
7. **If not clean (one retry):** call `generateFixes` again with the new issue as additional context → apply alternate fix → re-verify once. If still failing: return `{ verified: false, explanation: "Automatic fix could not be verified — review manually." }`. Never silently apply an unverified patch on the demo path.

### 18.5 Prompting principles (apply to all)

- Always pin the output via tool schema; never rely on "respond in JSON" alone.
- Give the model **only the in-force facts** — pre-filtering is the cheapest accuracy win.
- Few-shot with the demo world's own cases (include 1–2 worked examples in the detection prompt for the demo) to lock behavior.
- Low temperature, capped output tokens.
- Verbatim quotes for both `highlightedText` (from scene) and `evidenceQuote` (from canon) so the UI can locate spans and show real evidence.

---

## 19. JSON Schemas for AI Outputs

Define these as Zod schemas in `lib/ai/schemas.ts` and reuse them as the tool `input_schema` (via `zod-to-json-schema`) AND for server-side validation.

### 19.1 `emit_claims` output

```jsonc
{
  "inferredContext": {
    "presentation": "main",
    "anchorEventName": null,
    "branchName": null,
    "confidence": 0.35,
    "signals": [],
    "conflict": false
  },
  "claims": [
    {
      "claimText": "Jaime uses both hands",
      "claimType": "character_state",
      "entityMentions": ["Jaime"],
      "sceneQuote": "Jaime tightened the straps on both gauntlets",
      "impliedBranch": null,
      "confidence": 0.9
    }
  ]
}
```

### 19.2 `emit_issues` output

```jsonc
{
  "issues": [
    {
      "issueType": "world_rule",
      "severity": "high",
      "highlightedText": "filled the room with blue fire",
      "explanation": "Elira can only cast while carrying the moonstone, which canon says is locked in the Red Court vault, so she cannot cast here. Possible contradiction.",
      "evidenceQuotes": [
        "Elira can only cast magic while carrying a moonstone.",
        "The moonstone was stolen by the Red Court and locked in their vault."
      ],
      "conflictingFactIds": ["fact_elira_moonstone", "fact_moonstone_vault"],
      "confidence": 0.92,
      "suggestedFixes": [
        {
          "label": "Remove the spell",
          "description": "Cut the casting so the scene respects the magic rule.",
          "replacement": "Elira clenched her empty hands, the spell beyond her reach",
          "preservesVoice": true
        },
        {
          "label": "She recovers the moonstone first",
          "description": "Add that she's reclaimed the moonstone (requires canon update).",
          "replacement": "Elira, the recovered moonstone warm in her palm, whispered a spell and filled the room with blue fire",
          "preservesVoice": true
        }
      ]
    }
  ]
}
```

### 19.3 `emit_canon` output

```jsonc
{
  "entities": [
    { "name": "Elira", "type": "character", "aliases": ["the mage"], "summary": "Mage; casts only with the moonstone" }
  ],
  "events": [
    { "name": "Siege of Veyr", "relativeOrderHint": "early", "summary": "Daren loses his left hand" }
  ],
  "branches": [
    { "name": "Branch A", "description": "Mira survives the Red Gate" }
  ],
  "facts": [
    {
      "text": "Daren lost his left hand during the Siege of Veyr.",
      "factType": "character_state",
      "entities": ["Daren"],
      "sourceQuote": "Daren lost his left hand during the Siege of Veyr.",
      "confidence": 0.97,
      "validityFromEvent": "Siege of Veyr",
      "validityUntilEvent": null,
      "branch": null,
      "epistemicStatus": "objective"
    }
  ]
}
```

### 19.4 `emit_fixes` output

```jsonc
{
  "fixes": [
    { "label": "Use his right hand", "description": "Daren acts one-handed.",
      "replacement": "gripped the reins with his good hand", "preservesVoice": true }
  ]
}
```

**Post-processing:** the server assigns `id`s, maps `sceneQuote`/`highlightedText` to character spans via `indexOf` (fuzzy fallback: normalize whitespace, then a token-overlap search), resolves `entityMentions`/`entities` to entity ids, resolves `validityFromEvent` names to event ids, resolves `impliedBranch` string to a `Branch.id` (see §19.5 and §14.5), and fills `projectId`/`status`/timestamps. The model is never asked to produce ids or offsets.

### 19.5 Canon-builder tool schemas (Zod — `lib/ai/schemas.ts`)

The canon-builder agent uses individual tool calls, not a single `emit_canon` dump. Define these Zod schemas in `lib/ai/schemas.ts`; pass each as `input_schema` via `zod-to-json-schema`:

```ts
import { z } from 'zod';

export const AddEntityInput = z.object({
  name:    z.string(),
  type:    z.enum(['character','location','faction','object','event','rule']),
  aliases: z.array(z.string()).optional(),
  summary: z.string().optional(),
});

export const AddFactInput = z.object({
  text:               z.string(),
  factType:           FactTypeSchema,            // z.enum([...]) from §15
  entities:           z.array(z.string()),       // entity names; server resolves to IDs
  sourceQuote:        z.string(),
  confidence:         z.number().min(0).max(1).default(0.9),
  validityFromEvent:  z.string().nullable().optional(), // event name; server resolves to ID
  validityUntilEvent: z.string().nullable().optional(), // exclusive end; server resolves to ID
  branch:             z.string().nullable().optional(), // branch name; server resolves to ID
  epistemicStatus:    EpistemicStatusSchema.default('objective'),
});

export const AddEventInput = z.object({
  name:      z.string(),
  orderHint: z.enum(['early','mid','late']).optional(), // hint; server assigns integer order
  summary:   z.string().optional(),
});

export const AddBranchInput = z.object({
  name:         z.string(),
  parentBranch: z.string().nullable().optional(), // branch name; null = main
  description:  z.string().optional(),
});

export const SearchCanonInput = z.object({
  query: z.string(),
  topK:  z.number().int().min(1).max(10).default(5),
});
```

**Post-processing for canon-builder outputs:** the server assigns `order` integers to events in insertion order (or by resolving `orderHint` relative to existing events). All string references (entity/event/branch names) are resolved to stable IDs after the agent loop completes. The agent never produces IDs directly — only human-readable names.

---

## 20. Retrieval / Memory Strategy

**Hackathon position:** the GoT seed has ≤8 facts — Tier 0 (all in-force) is correct for checks. **Redis is still required** for sponsor integration: vector index over canon facts, check-result cache, session state, and **canon-builder agent working memory**.

### 20.1 Tiered retrieval (behind one interface)

```ts
interface FactRetriever {
  getCandidateFacts(claims: Claim[], ctx: SceneContext): Promise<CanonFact[]>;
}
```

- **Tier 0 — All-in-force (check hot path default for small worlds):** return every fact in force for position+branch. `InMemoryRetriever` backed by Redis-loaded store.
- **Tier 1 — Entity filter:** intersect facts whose `entityIds` overlap claims' entities (+ all global `world_rule` facts).
- **Tier 2 — Vector retrieval (Redis — required build):** embed each `CanonFact.text` at ingest; on check, embed claims → top-k from **Redis vector search** → apply position/branch/entity filters. `RedisRetriever`. Also powers `search_existing_canon` in the canon-builder agent.

**Embedding model:** `text-embedding-3-small` (OpenAI). Add `OPENAI_API_KEY` to `.env` (alongside `ANTHROPIC_API_KEY`). Dimensions: 1536. Call `openai.embeddings.create({ model: 'text-embedding-3-small', input: text })` at ingest time and at query time. The same model must be used for both index and query — never mix models within a single Redis vector index.

Wire Tier 0 for the GoT demo check path; **implement Tier 2 for Redis sponsor** and canon-builder dedupe. Same interface — not a rewrite.

### 20.2 What lives in Redis

- `canon:fact:{id}` → fact JSON + vector embedding.
- `canon:idx:{projectId}` → vector index for KNN.
- `agent:canon:{sessionId}:*` → canon-builder working memory (entities/facts staged during loop).
- `session:{id}:issues` / `session:{id}:scene` → draft + issues (refresh-safe).
- `check:{hash(sceneText+context)}` → cached issues (demo pre-warm).
- `ingest:{hash(text)}` → cached ingestion output (demo pre-warm — **never cold-ingest on stage**).

### 20.3 Anthropic + Redis together

- **Anthropic:** structured extraction, extended-thinking contradiction detection, agent tool loops — the reasoning layer.
- **Redis:** durable story memory at scale — embeddings, agent scratchpad, cache. Pitch line: *"Claude reasons over structured state; Redis remembers the world."*


---

## 21. Frontend Architecture

**Stack (locked):** Next.js 14 (App Router) · React · TypeScript · Tailwind · TipTap editor · Zustand for state · Timeline viz component (should-have) · React Flow (nice-to-have graph only).

### 21.1 Component tree

```
app/
  page.tsx                      // the three-panel shell
components/
  TopBar.tsx                    // project name, world selector, Check button
  panels/
    StoryBible.tsx              // left panel container
      EntityList.tsx            // grouped entities w/ state badges
      WorldRulesList.tsx
      TimelineTrack.tsx         // "you are here" + dimmed out-of-window facts (should-have)
      BranchList.tsx
      RelationshipGraph.tsx     // React Flow (nice-to-have only)
    SceneEditor.tsx             // center panel container
      SceneContextBar.tsx       // editable context chips (manual + inferred)
      Editor.tsx                // TipTap instance + decoration plugin
    IssuePanel.tsx              // right panel container
      IssueList.tsx
      IssueCard.tsx
      IssueDetail.tsx           // explanation, evidence, fixes, actions
hooks/
  useContinuumStore.ts          // Zustand: canon, scene, issues, selection
  useCheck.ts                   // calls /api/check, manages loading/cache
```

### 21.2 Why TipTap (not raw contenteditable)

We need stable, programmatic span decorations that survive edits, plus the ability to replace a span's text when applying a fix. ProseMirror (via TipTap) gives a real document model and a decoration API. Raw `contenteditable` makes offset tracking and decoration a nightmare. **Decision: TipTap.** Keep the schema minimal (paragraphs + text); we are not building a rich editor.

### 21.3 Highlight mechanism

- The store holds `issues: ContinuityIssue[]`, each with a `span {start,end}` in plain-text offsets.
- A TipTap **decoration plugin** reads issues from the store and renders inline decorations at the mapped ProseMirror positions, classed by severity (`.issue-high`, `.issue-medium`, `.issue-low`) and by status (resolved/ignored → no decoration).
- Mapping plain-text offsets → ProseMirror positions: maintain a single text node per paragraph; compute a paragraph-offset table once per check. (For the demo, the scene is a few paragraphs — keep it simple.)
- Clicking a decoration sets `selectedIssueId` in the store → right panel scrolls to / expands that issue, and vice-versa (card click highlights span + scrolls editor).

### 21.4 State (Zustand) shape

```ts
interface ContinuumState {
  project: Project;
  entities: Entity[]; facts: CanonFact[]; events: TimelineEvent[]; branches: Branch[];
  scene: { text: string; context: SceneContext };
  issues: ContinuityIssue[];
  selectedIssueId: ID | null;
  checking: boolean;
  ingesting: boolean;
  // actions
  setSceneText(t: string): void;
  setContext(c: Partial<SceneContext>): void;
  confirmContext(): void;               // mark chips confirmed
  applyInferredContext(i: InferredContext): void;
  runCheck(): Promise<void>;
  ingestCanon(textOrFile): Promise<void>;
  selectIssue(id: ID | null): void;
  setIssueStatus(id: ID, s: IssueStatus): void;
  applyFix(issueId: ID, fixId: ID): void; // via /api/repair verify loop
  addFact(f: CanonFact): void;
}
```

### 21.5 Check triggering

- Primary: explicit **Check Continuity** button (predictable for the demo).
- Secondary (stretch): debounced auto-check ~1200ms after typing stops, cancelable via `AbortController`, with the editor border showing a subtle "checking…" state. Auto-check OFF by default during the demo to avoid surprise latency.

---

## 22. Backend Architecture

**Stack (locked):** Next.js API route handlers + the `lib/engine` core. No separate server. (FastAPI is an option if you prefer Python for the AI layer, but a single Next.js repo is faster to ship and deploy for a hackathon — **default to all-Next.js**.)

### 22.1 Layers

```
app/api/*               // thin HTTP handlers: parse, call lib, return JSON
lib/
  engine/
    checkScene.ts        // orchestrates the pipeline (platform-agnostic)
    resolveContext.ts    // SceneContext -> resolvedPosition
    filterFacts.ts       // inForceAt + inBranch + entity narrowing
    mapSpans.ts          // model quotes -> text offsets (fuzzy)
  ai/
    client.ts            // Anthropic client wrapper
    models.ts            // explicit model routing per task (§17.1)
    schemas.ts           // Zod schemas (also -> tool input_schema)
    prompts/*.ts         // prompt templates
    tasks/
      extractClaims.ts   // claims + inferredContext
      detectContradictions.ts
      generateFixes.ts
  agents/
    canonBuilder.ts      // ingestion agent
    repairVerify.ts      // fix verify-loop agent
  store/
    index.ts             // FactStore interface
    memoryStore.ts       // in-memory view (MVP dev fallback)
    redisStore.ts        // Redis-backed store (required for hackathon)
  retriever/
    index.ts             // FactRetriever interface
    inMemory.ts          // Tier 0/1
    redis.ts             // Tier 2 vector retrieval (required)
  trace/
    index.ts             // Arize export (required)
  types.ts
seed/
  world.ts               // typed demo world
  world.json
```

### 22.2 The engine is the product

`checkScene(sceneText, context, store, retriever, ai)` is a **pure-ish orchestrator** with no Next.js dependency. The HTTP handler is a 10-line adapter. This is the architectural promise that makes the browser extension and future Docs add-on cheap: they hit `/api/check` with `{ sceneText, context }` and get back `ContinuityIssue[]`. **Never put business logic in the route handler.**

### 22.3 Config

`.env`: `ANTHROPIC_API_KEY`, `REDIS_URL`, `ARIZE_SPACE_ID`, `ARIZE_API_KEY` (or equivalent). Feature flags: `RETRIEVER=memory|redis` (default `redis` for hackathon), `TRACING=on`. Dev-only fallback: app runs with *only* `ANTHROPIC_API_KEY` + in-memory store for local UI work — but ship target includes Redis + Arize.

---

## 23. Platform / Integration Strategy

The engine is surface-agnostic on purpose. Surfaces are added in priority order; **none block the MVP.**

| Stage | Surface | What it is | Effort |
|---|---|---|---|
| **MVP** | Continuum web editor | Three-panel app; GoT demo; ingestion; timeline viz. | core |
| Stretch | Browser extension stub | Selected text → POST `/api/check` → sidebar issues. | small–med |
| Future | Google Docs add-on | Real inline margin comments via Apps Script / Docs API. Heavy; not now. | large |
| Future | Notion / Obsidian / Scrivener / VS Code | Editor plugins calling the API. | large |
| Future | Public API | Third-party writing surfaces call the engine directly. | med |

**The pitch line:** "Continuum is an engine with surfaces. Today it's a web editor; because the engine is a clean API, the same checks drop into Google Docs, Obsidian, or a game-writing tool without touching the core." Show the extension stub (if built) for 10 seconds to make this concrete — it's a disproportionately strong "this is a platform" signal for tiny effort.

**Do not** build a real Google Docs add-on for the hackathon. It's an OAuth + Apps Script time sink with no extra demo value over the stub.

---

## 24. Suggested Repository Structure

```
continuum/
  app/
    layout.tsx
    page.tsx                      # three-panel shell
    globals.css
    api/
      project/route.ts            # GET canon
      check/route.ts              # POST core check
      ingest/route.ts             # POST core ingest + file upload
      repair/route.ts             # POST repair verify-loop
      extract-claims/route.ts     # POST (optional)
      issue/[id]/route.ts         # PATCH status
      canon/fact/route.ts         # POST update canon
      export/route.ts             # GET (nice-to-have)
  components/
    TopBar.tsx
    panels/
      StoryBible.tsx
      SceneEditor.tsx
      IssuePanel.tsx
      ...(sub-components per §21)
  hooks/
    useContinuumStore.ts
    useCheck.ts
  lib/
    types.ts
    engine/ { checkScene, resolveContext, filterFacts, mapSpans }
    ai/ { client, models, schemas, prompts/, tasks/ }
    agents/ { canonBuilder, repairVerify }
    store/ { index, memoryStore, redisStore }
    retriever/ { index, inMemory, redis }
    trace/ { index }              # Arize
  seed/
    world.ts                      # GoT primary
    world.json
    world-moonstone.ts            # zero-IP fallback
  extension/                      # stretch: browser extension stub
    manifest.json
    content.js
    sidebar.html
  PROJECT_RULES.md                # the vibe-coding rules (see §30)
  CLAUDE.md                       # same rules, for Claude Code
  README.md
  .env.example
  package.json
```

---

## 25. Build Milestones

Ordered for vibe-coding. **Each milestone is independently runnable and demoable.** Do not start N+1 until N's acceptance criteria pass. Early milestones are intentionally fake — get a clickable demo standing *first*, then make it real underneath.

### M0 — Project skeleton
- **Goal:** Next.js + TS + Tailwind app that boots to an empty three-panel layout.
- **Tasks:** scaffold app, Tailwind, base layout grid, TopBar. Add `lib/types.ts` (§15 incl. `InferredContext`). Add `seed/world.ts` (GoT, §10.1–10.4) + `seed/world-moonstone.ts` (§10.8).
- **Acceptance:** `npm run dev` shows three labeled panels; seed imports type-check.
- **Don't build yet:** AI, API, editor internals.

### M1 — Static mocked UI with hardcoded canon and hardcoded issues
- **Goal:** Entire GoT demo clickable with fake data — permanent fallback.
- **Tasks:** render GoT canon from `seed/world.ts`. Contradictory draft (§10.5) in center. Hardcode 4 expected issues (§10.6). Issue cards + evidence. Static `<mark>` highlights. Bidirectional selection.
- **Acceptance:** Zero network calls → canon, 4 highlights, click each → explanation + evidence + fixes; Ignore dims card.
- **Don't build yet:** real editing, real checks, context chips logic.

### M2 — Highlighting behavior on a real editor
- **Goal:** TipTap decorations from hardcoded issue spans; Apply fix = text replace (verify loop comes later).
- **Acceptance:** 4 hardcoded issues highlight correctly; Apply fix edits prose + clears highlight.
- **Don't build yet:** real AI; context chips cosmetic.

### M3 — Real continuity-check endpoint (2-call hot path)
- **Goal:** `POST /api/check` returns real GoT issues on Main timeline.
- **Tasks:** Anthropic client, models config, Zod schemas, prompts (§18.2/§18.3), `extractClaims` (claims only first) + `detectContradictions`, `checkScene`, span mapping, canned fallback. Extended thinking on detection.
- **Acceptance:** Check on §10.5 draft → ~4 real issues; fallback on error; latency <~8s.
- **Don't build yet:** context inference, time/branch filtering, ingestion, repair agent.

### M4 — JSON hardening + cache + Arize tracing
- **Goal:** Reliable output + observability foundation.
- **Tasks:** tool-use/structured outputs; repair-retry; demo cache + pre-warm; Arize spans on extract + detect; few-shot GoT examples in detection prompt. Add `inferredContext` to claim extraction schema (wire UI pre-fill in M5).
- **Acceptance:** 10 consecutive checks stable; Arize shows extract → detect trace; cache hit instant.
- **Don't build yet:** agents, Redis, ingestion UI.

### M5 — Hybrid context + branch + time filtering
- **Goal:** Context chips drive filtering; flashback suppresses; branch scoping works.
- **Tasks:** `SceneContextBar` editable chips (confirmed/unconfirmed). `resolveContext`, `filterFacts`, per-claim branch scoping (§14.5). Wire `inferredContext` pre-fill. Flashback draft (§10.7) → 0 issues. **Manual chip flip** is the demo flashback beat.
- **Acceptance:** Main → 4 issues; Flashback-before-`evt_jaime_captured` + both-hands line → 0; branch inline claim flags; `meta.factsFiltered` correct.
- **Don't build yet:** ingestion, timeline viz, repair verify.

### M6 — Story bible display polish
- **Goal:** Left panel looks like a real tool.
- **Tasks:** collapsible sections, entity badges, timeline event list, branch preview, issue status lifecycle.
- **Acceptance:** canon readable at a glance; status persists in session.
- **Don't build yet:** ingestion (next), timeline track viz.

### M7 — Canon ingestion + file upload + canon-builder agent + Redis (core)
- **Goal:** Paste/upload canon → structured bible; Redis vector index + agent memory.
- **Tasks:** `POST /api/ingest` (`.txt`/`.md`/`.docx`), canon-builder agent (§17.5), ingest UI modal + upload button, `redisStore` + `RedisRetriever`, embed facts on commit. **Pre-test and cache** §10.9 ingestion input.
- **Acceptance:** pre-tested ingest reproduces ≥7 GoT facts (including Fact 3b and Fact 5b); vector search returns relevant facts; check still passes golden test on ingested canon; **never required live on stage**.
- **Don't build yet:** timeline viz, repair verify.

### M8 — Timeline visualization (should-have)
- **Goal:** Make chronology vs narrative order **visible**.
- **Tasks:** `TimelineTrack.tsx` — events in order, branch fork, **"you are here"** marker from `resolvedPosition`, facts/events not yet in force **greyed/dimmed**. Syncs when context chips change.
- **Acceptance:** flashback chip moves marker; lost-hand fact greys out before `evt_jaime_captured`; demo beat lands visually.
- **Don't build yet:** graph, deploy polish.

### M9 — Repair verify-loop agent
- **Goal:** Apply fix is verified, not blind.
- **Tasks:** `POST /api/repair`, repair agent (§17.5), wire Apply fix button, "verified ✓" UI, Arize spans `ai.repair.*`. Optional: show Arize before/after prompt improvement story.
- **Acceptance:** Apply fix on Jaime-hands issue → patched text passes re-check; unverified patch not applied silently on demo path.
- **Don't build yet:** graph.

### M10 — Deployment + demo polish
- **Goal:** Deployed, rehearsed, crash-proof; closing generalization beat scripted.
- **Tasks:** Vercel deploy; env (Anthropic + Redis + Arize); rehearse §9 script incl. agent-memory close; fallback hotkey; backup recording; one hardcoded non-fiction sample slide optional.
- **Acceptance:** full §9 script <3 min twice without hang; pre-cached ingest + check verified; closing beat ready.

### M11 — Relationship graph (nice-to-have)
- **Goal:** React Flow graph if time remains.
- **Acceptance:** renders GoT entities; safe to skip entirely.

---

## 26. Testing Strategy

Hackathon-appropriate: a thin layer of high-value tests around the engine, manual checks for UI. The engine is where correctness lives, so test it.

- **Engine unit tests (`lib/engine`):**
  - `resolveContext`: main → +∞; flashback-before-X → < order(X); flash-forward → > order(X).
  - `filterFacts`: Jaime's hand fact in force on Main, filtered out for pre-capture flashback; branch facts filtered by branch id; per-claim branch scoping; world rules always present.
  - `mapSpans`: exact and whitespace-fuzzy quote → correct offsets; missing quote handled gracefully.
- **Golden-case integration test (`/api/check`):** GoT demo draft (§10.5) on Main timeline yields issues covering types in §10.6 (assert by `issueType` set). Flashback draft (§10.7) yields **zero** issues. Snapshot model responses for CI.
- **Ingestion test:** pre-tested §10.9 input → ≥6 facts with correct event order (cached; no live CI dependency required).
- **Repair test:** apply fix on Jaime-hands issue → `verified: true` after re-check.
- **Schema validation tests:** malformed model output → Zod catches → repair/fallback path returns a valid (possibly canned) response, never throws.
- **Manual UI checklist (run before demo):** highlights on right phrases; span↔card sync; Apply fix shows verified ✓; context chip manual flip changes results; timeline "you are here" moves; greyed facts on flashback; fallback hotkey; pre-warm cache; **ingest replay from cache only**.

**The single most important test:** golden-case "4 issues on main, 0 on flashback" + ingestion cache hit for demo input.

---

## 27. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Live LLM call slow/fails on stage | med | fatal | Pre-warm + cache the demo result; canned-fallback hotkey loads M1 issues; record a backup video. |
| Model misses an expected contradiction | med | high | Low temp + few-shot the detection prompt with the demo cases; pre-filter to in-force facts; cache a known-good run for the demo. |
| Model returns invalid JSON | med | high | Tool-use/structured output + Zod + one repair retry + fallback. |
| Span mapping misaligns highlights | med | med | Model returns verbatim `highlightedText`; `indexOf` then whitespace-normalized fuzzy match; if not found, show issue as a card without a highlight (degrade gracefully). |
| TipTap decoration complexity eats time | med | med | Keep editor schema minimal; M2 is isolated; M1 static highlights are the fallback path. |
| Scope creep (auth, generic KB, Docs add-on, prose gen) | high | high | PROJECT_RULES.md (§30); milestone gating; every feature must serve canon→draft→contradiction→evidence→fix. |
| Over-flagging (false positives) tanks credibility | med | high | Conservative detection prompt; pre-filtering; confidence threshold to hide weak issues; "possible contradiction" framing. |
| Time/branch logic overengineered | med | med | Integer order + two nullable event refs + branch id only. No solver. |
| Live cold-ingestion on stage | med | fatal | Pre-cache §10.9 ingest; show seed or cached bible only. |
| Demo world doesn't produce clean issues | low | high | Curate GoT seed + prompts; golden test; Moonstone fallback. |
| Redis/Arize setup friction | med | med | Interfaces first; in-memory dev fallback; ship with creds ready. |
| Repair verify loop adds latency | med | low | Fast model; scope re-check to patched neighborhood; cache. |

---

## 28. Sponsor Integration Strategy

Three sponsors, all **actively built** — not name-dropped.

### Anthropic (core — built with Claude Code)
- **What we ship:** structured extraction, extended-thinking contradiction detection, two real tool-using agents (canon-builder, repair verify), hybrid context inference.
- **Pitch angle:** "Shift what's possible" — Continuum turns unstructured prose into **checkable mutable state** and catches drift with evidence. Direct read-across to **AI agent memory consistency** (the closing generalization beat).
- **Story:** *"Claude extracts state, reasons about contradictions with extended thinking, and powers the agents that build and verify canon — built with Claude Code."*

### Redis (core — real integration)
- **What we ship:** vector retrieval over `CanonFact` embeddings; canon-builder agent working memory (`agent:canon:*`); session + check/ingest caches.
- **Pitch angle:** Redis "agent memory" criterion — Continuum's story memory is facts + embeddings + agent scratchpad, fast to query at scale.
- **Story:** *"Redis remembers the world so Claude can reason over it — retrieval, agent memory, and session state in one place."*

### Arize (core — real instrumentation)
- **What we ship:** spans for every AI step (§17.4); a **shown before/after** — e.g. tightened detection prompt after trace showed over-flagging on GoT draft.
- **Pitch angle:** observability-driven improvement on a production-shaped LLM pipeline, not a generic latency chart.
- **Story:** *"We trace every check, found over-flagging in Arize, tightened the prompt, and shipped the fix — here's the diff."*

**Dropped as non-fits:** Browserbase, Fetch AI, Sentry-as-sponsor-substitute, and any "we technically called five APIs" sprawl.


---

## 29. Final Pitch / Tagline

**Primary tagline (demo):**
> **Grammarly catches grammar. Continuum catches broken canon.**

**Product thesis (slide):**
> **Continuum is state management for stories.**

**90-second written pitch:**
> Every long story is a giant pile of state — who's alive, who has the sword, who's at war, who knows the secret. Writers and show runners track it in bibles that rot the moment writing outpaces note-taking. Generic AI writes more prose but has no model of *your* world.
>
> Continuum turns canon into structured, checkable state — upload your notes, we structure them — and reads every new scene against it. Possible contradictions inline, with the exact canon quote they break, and verified one-click fixes. It handles flashbacks, alternate timelines, and the gap between when the reader sees something and when it happened in the world.
>
> We demo on Game of Thrones because everyone gets "wait, didn't he lose his hand?" Under the hood: Claude with extended thinking, a canon-builder agent, Redis story memory, and Arize-traced improvements. **Same engine for AI agent memory** — facts that accumulate, branch, and contradict over long runs. Product specs and legal facts are the same shape; fiction is the hardest case we proved first.

**Closing beat (~20–30 sec — agent memory, one slide):**
> Long-running AI agents are story engines without a story bible. They accumulate facts, contradict themselves, and never cite sources. Continuum is state management for narratives — and the consistency layer agent builders need. We proved it on Westeros first.

---

## 30. Vibe Coding Instructions for Claude Code / Cursor

Create **`PROJECT_RULES.md`** and **`CLAUDE.md`** at the repo root with the content below (identical). These are the guardrails for the coding agent. Paste verbatim.

````markdown
# Continuum — Project Rules (read before every task)

## What we are building
A live consistency engine for fictional/TV worlds. Three-panel web app:
canon bible (left) | live scene editor (center) | continuity issues (right).
Demo world: **Game of Thrones (show)** — ≤8 facts (see §10.1 and §10.10), original scene prose only.
Core loop: **canon → draft → contradiction → evidence → verified fix.**

## Hard rules
- Build ONE milestone at a time (see CONTINUUM_DESIGN.md §25). Do NOT start the
  next milestone until the current one's acceptance criteria pass. Test first.
- Do NOT add authentication, accounts, billing, or multi-tenancy.
- Do NOT add AI features that generate story prose. Continuum generates fixes and
  structured data only — never narrative content for the user's manuscript.
- Do NOT turn this into a chatbot. No chat UI, no message bubbles.
- Do NOT turn the MVP into a universal/generic knowledge-graph app. No domain
  selector, no legal/product/research templates built in. Fiction/TV only in UI.
- Do NOT cold-ingest or cold-check untested input on the demo path. Pre-cache
  ingestion + check results for stage.
- Prefer a WORKING DEMO over perfect architecture. Ship the clickable thing.
- Use seed/world.ts (GoT) + seed/world-moonstone.ts (fallback).
- All AI outputs MUST be strict JSON validated with Zod (tool-use/structured
  output). On invalid output: one repair retry, then fall back.
- Live check hot path = **2 LLM calls only** (extract+infer → detect). Agents
  are for ingestion and repair verify — not for every check click.

## Architecture rules
- lib/engine/checkScene.ts is platform-agnostic; route handlers are thin adapters.
- Pre-filter canon facts by time validity + branch IN CODE before the LLM sees them.
- Hybrid scene context: inference pre-fills chips; **user chips are source of truth**.
- Per-claim branch scoping when prose names a branch (§14.5).
- Model routing in lib/ai/models.ts (§17.1): fast = extract/infer/fix/verify;
  strongest + extended thinking = contradiction detection only; mid/strong + tools
  = canon-builder agent.
- Redis: vector retrieval + canon-builder agent memory + caches (required for ship).
- Arize: real spans on every AI step; aim for a shown before/after improvement.
- The model never produces ids or character offsets; server maps verbatim quotes.

## Demo-safety rules (non-negotiable)
- Canned-fallback issues (M1 hardcoded GoT data) on LLM error or hotkey.
- Cache demo check + ingestion by hash; pre-warm on app load.
- Phrase issues as "possible contradiction," never "error."
- Flashback demo beat = **manual chip flip**, not reliance on inference alone.

## Do-not-touch list (out of scope — do not build)
full prose generation · Google Docs clone · production Docs integration ·
real-time Docs comments · D&D campaign manager · game engine · production auth ·
"perfect" detection · 500-page ingestion · mobile app · enterprise KB ·
generic legal/product/research templates · domain selector · live cold-ingest on stage.

## Definition of done for a milestone
1. Acceptance criteria in CONTINUUM_DESIGN.md §25 pass.
2. Dev fallback: app runs with only ANTHROPIC_API_KEY + in-memory store.
3. Ship target: Redis + Arize integrated by M10.
4. Core demo (canon → draft → contradiction → evidence → verified fix) works.
5. Update engine tests (§26) if you touched lib/engine.
````

### How to drive the build (paste as your first message to the agent)

> Read `CONTINUUM_DESIGN.md` and `CLAUDE.md`. We are building Continuum. Implement
> **Milestone M0** only (project skeleton, §25). Use the locked stack: Next.js 14
> App Router, TypeScript, Tailwind, TipTap, Zustand. Paste the data model from §15
> into `lib/types.ts` and the GoT demo world from §10 into `seed/world.ts`
> (plus `seed/world-moonstone.ts` from §10.8). When M0's acceptance criteria pass and `npm run dev` shows three labeled panels with no
> errors, STOP and tell me. Do not start M1.

Then, per milestone:

> M0 passes. Now implement **Milestone M{n}** only, per §25. Follow all rules in
> `CLAUDE.md`. When the acceptance criteria pass, run the relevant tests from §26,
> then STOP and summarize what changed and how to verify it. Do not start M{n+1}.

### Sequencing reminder (the order is deliberate)
`M0 skeleton → M1 fully-faked clickable demo → M2 real editor + decorations →
M3 real check endpoint → M4 JSON hardening + Arize + cache → M5 hybrid context/branch/time
filtering → M6 bible polish → M7 ingestion + canon-builder + Redis → M8 timeline viz →
M9 repair verify-loop → M10 deploy + rehearse → M11 graph (skip if behind).`

Get the **fake** demo fully clickable (M1) before anything is real. That gives you
a shippable demo on day one and a permanent fallback. Everything after M1 is
"make the fake thing real underneath, one layer at a time."

---

## Appendix A — Quick reference: GoT demo contradictions

| # | Phrase in draft | Type | Conflicting canon |
|---|---|---|---|
| 1 | "both gauntlets" | character_state | Jaime lost his right hand after capture |
| 2 | "reached King's Landing by sunset" | travel_time | Winterfell → KL takes weeks |
| 3 | "dragons wheeled … every lord had grown up seeing" | world_rule | No living dragons until Dany hatches eggs |
| 4 | "Robb survived … Catelyn was already dead" | branch | Contradicts Fact 5b (`fact_catelyn_lives`): Catelyn also survived in the Robb-lives branch |

And the one that must **NOT** flag:

| Context | Phrase | Why no flag |
|---|---|---|
| Flashback before Jaime's capture | "caught the wine cup with both hands" | Lost-hand fact not in force yet |

*(Moonstone Saga equivalents in §10.8.)*

## Appendix B — Decisions locked by this doc (so the agent doesn't re-litigate)

- Editor: **TipTap** (not raw contenteditable).
- Backend: **all Next.js** (not a separate FastAPI service).
- Demo world: **Game of Thrones (show)** primary; **Moonstone Saga** zero-IP fallback.
- Scene context: **hybrid chips** — inference pre-fills, user chips are source of truth; one context per draft.
- Persistence: **Redis-backed store** for hackathon ship target; in-memory dev fallback OK locally.
- Retrieval: **Tier 0 for checks on small worlds**; **Redis vector search required** for sponsor + canon-builder.
- Time model: **integer event order + nullable validity event refs**; timeline viz with **"you are here"**.
- Branches: **flat off main**; per-claim branch scoping for inline branch prose.
- Hot path: **2-call pipeline** (extract+infer → detect w/ extended thinking) — **not agentic**.
- Agents: **canon-builder** (ingestion) + **repair verify-loop** (apply fix) — real tool loops.
- Ingestion: **core** — `.txt`/`.md`/`.docx`; pre-cache for stage; never cold-ingest live.
- Sponsors built: **Anthropic + Redis + Arize** (all three, visibly).
- First surface: **web editor only**; extension is nice-to-have.
