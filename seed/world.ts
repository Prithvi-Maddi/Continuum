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

const S = 'src_got_seed';
const P = 'proj_got_demo';

// ── Entities ──────────────────────────────────────────────────────────────────
export const ENTITY_JAIME: Entity = {
  id: 'ent_jaime', projectId: P, name: 'Jaime Lannister', type: 'character',
  aliases: ['the Kingslayer', 'Jaime', 'Ser Jaime'],
  summary: 'Lost his right sword hand after capture. Killed in the Red Keep collapse.',
};
export const ENTITY_NED: Entity = {
  id: 'ent_ned', projectId: P, name: 'Ned Stark', type: 'character',
  aliases: ['Eddard Stark', 'Lord Stark', 'Lord Eddard'],
  summary: "Executed at King's Landing. Dead.",
};
export const ENTITY_ROBB: Entity = {
  id: 'ent_robb', projectId: P, name: 'Robb Stark', type: 'character',
  aliases: ['the Young Wolf', 'King of the North', 'King Robb'],
  summary: 'Killed at the Red Wedding at the Twins. Dead.',
};
export const ENTITY_CATELYN: Entity = {
  id: 'ent_catelyn', projectId: P, name: 'Catelyn Stark', type: 'character',
  aliases: ['Lady Stark', 'Cat', 'Catelyn Tully'],
  summary: 'Killed at the Red Wedding. Dead.',
};
export const ENTITY_DAENERYS: Entity = {
  id: 'ent_daenerys', projectId: P, name: 'Daenerys Targaryen', type: 'character',
  aliases: ['Dany', 'Khaleesi', 'Mother of Dragons', 'the Dragon Queen', 'Daenerys Stormborn'],
  summary: 'Hatched three dragons. Killed by Jon Snow after burning King\'s Landing.',
};
export const ENTITY_JON: Entity = {
  id: 'ent_jon', projectId: P, name: 'Jon Snow', type: 'character',
  aliases: ['Lord Snow', 'Lord Commander Snow', 'Aegon Targaryen', 'the bastard of Winterfell'],
  summary: 'Bastard son of Ned Stark (true parentage: Lyanna Stark + Rhaegar Targaryen). Joined Night\'s Watch, became Lord Commander, killed by mutineers, resurrected, exiled to the far north.',
};
export const ENTITY_SANSA: Entity = {
  id: 'ent_sansa', projectId: P, name: 'Sansa Stark', type: 'character',
  aliases: ['Lady Sansa'],
  summary: 'Survived. Became Queen in the North.',
};
export const ENTITY_ARYA: Entity = {
  id: 'ent_arya', projectId: P, name: 'Arya Stark', type: 'character',
  aliases: ['Arya'],
  summary: 'Survived. Trained with the Faceless Men. Killed the Night King. Sailed west.',
};
export const ENTITY_BRAN: Entity = {
  id: 'ent_bran', projectId: P, name: 'Bran Stark', type: 'character',
  aliases: ['Brandon Stark', 'the Three-Eyed Raven'],
  summary: 'Survived. Became the Three-Eyed Raven. Elected King of the Six Kingdoms.',
};
export const ENTITY_RICKON: Entity = {
  id: 'ent_rickon', projectId: P, name: 'Rickon Stark', type: 'character',
  aliases: [],
  summary: 'Killed by Ramsay Bolton\'s arrow during Battle of the Bastards. Dead.',
};
export const ENTITY_CERSEI: Entity = {
  id: 'ent_cersei', projectId: P, name: 'Cersei Lannister', type: 'character',
  aliases: ['Queen Cersei', 'the Queen'],
  summary: 'Queen of the Seven Kingdoms after Joffrey and Tommen. Killed in Red Keep collapse.',
};
export const ENTITY_TYRION: Entity = {
  id: 'ent_tyrion', projectId: P, name: 'Tyrion Lannister', type: 'character',
  aliases: ['the Imp', 'Lord Tyrion'],
  summary: 'Served as Hand of the King, fled to Essos, became Hand to Daenerys. Made Hand to King Bran.',
};
export const ENTITY_JOFFREY: Entity = {
  id: 'ent_joffrey', projectId: P, name: 'Joffrey Baratheon', type: 'character',
  aliases: ['King Joffrey', 'Prince Joffrey'],
  summary: 'King of the Seven Kingdoms. Son of Cersei and Jaime. Poisoned at the Purple Wedding. Dead.',
};
export const ENTITY_TOMMEN: Entity = {
  id: 'ent_tommen', projectId: P, name: 'Tommen Baratheon', type: 'character',
  aliases: ['King Tommen'],
  summary: 'Succeeded Joffrey as king. Died by suicide after Great Sept destruction. Dead.',
};
export const ENTITY_ROBERT: Entity = {
  id: 'ent_robert', projectId: P, name: 'Robert Baratheon', type: 'character',
  aliases: ['King Robert', 'the King'],
  summary: 'King of the Seven Kingdoms at the start of the story. Dead before main events.',
};
export const ENTITY_MAESTER_LUWIN: Entity = {
  id: 'ent_maester_luwin', projectId: P, name: 'Maester Luwin', type: 'character',
  aliases: ['Luwin'],
  summary: 'Maester of Winterfell. Killed during the Sack of Winterfell.',
};
export const ENTITY_WINTERFELL: Entity = {
  id: 'ent_winterfell', projectId: P, name: 'Winterfell', type: 'location',
  summary: 'Stark ancestral seat in the North.',
};
export const ENTITY_KINGS_LANDING: Entity = {
  id: 'ent_kings_landing', projectId: P, name: "King's Landing", type: 'location',
  aliases: ['the capital', 'the Red Keep'],
  summary: 'Capital of the Seven Kingdoms. Weeks of overland travel from Winterfell.',
};
export const ENTITY_THE_TWINS: Entity = {
  id: 'ent_the_twins', projectId: P, name: 'the Twins', type: 'location',
  aliases: ['the Crossing', 'the Frey castle'],
  summary: 'Frey stronghold at the crossing of the Green Fork. Red Wedding site.',
};
export const ENTITY_THE_WALL: Entity = {
  id: 'ent_the_wall', projectId: P, name: 'the Wall', type: 'location',
  aliases: ['Castle Black'],
  summary: 'Massive ice fortification hundreds of miles north of Winterfell. Night\'s Watch headquarters.',
};
export const ENTITY_DRAGONS: Entity = {
  id: 'ent_dragons', projectId: P, name: 'Dragons', type: 'object',
  aliases: ['Drogon', 'Rhaegal', 'Viserion'],
  summary: 'First living dragons in over a century. Hatched by Daenerys from petrified stone eggs.',
};
export const ENTITY_NIGHTS_WATCH: Entity = {
  id: 'ent_nights_watch', projectId: P, name: "Night's Watch", type: 'faction',
  aliases: ['the Watch', 'the Black Brothers', 'the Crows'],
  summary: 'Sworn brotherhood guarding the Wall. Members take vows of celibacy and political neutrality.',
};
export const ENTITY_IRON_THRONE: Entity = {
  id: 'ent_iron_throne', projectId: P, name: 'Iron Throne', type: 'object',
  summary: 'Symbol of rule over the Seven Kingdoms. Destroyed by Drogon after Daenerys\'s death.',
};

// ── Timeline events ───────────────────────────────────────────────────────────
export const EVT_DRAGONS_HATCHED: TimelineEvent = {
  id: 'evt_dragons_hatched', projectId: P,
  name: "Daenerys hatches three dragon eggs (Drogo's funeral pyre)", order: 1, branchId: null,
};
export const EVT_NED_EXECUTED: TimelineEvent = {
  id: 'evt_ned_executed', projectId: P,
  name: "Ned Stark executed at King's Landing", order: 2, branchId: null,
};
export const EVT_JAIME_CAPTURED: TimelineEvent = {
  id: 'evt_jaime_captured', projectId: P,
  name: 'Jaime Lannister loses his right hand', order: 3, branchId: null,
};
export const EVT_RED_WEDDING: TimelineEvent = {
  id: 'evt_red_wedding', projectId: P,
  name: 'The Red Wedding — Robb and Catelyn killed at the Twins', order: 4, branchId: null,
};
export const EVT_PURPLE_WEDDING: TimelineEvent = {
  id: 'evt_purple_wedding', projectId: P,
  name: 'The Purple Wedding — Joffrey poisoned and killed', order: 5, branchId: null,
};
export const EVT_JON_LORD_COMMANDER: TimelineEvent = {
  id: 'evt_jon_lc', projectId: P,
  name: "Jon Snow elected Lord Commander of the Night's Watch", order: 6, branchId: null,
};
export const EVT_JON_DIES: TimelineEvent = {
  id: 'evt_jon_dies', projectId: P,
  name: 'Jon Snow stabbed to death by Night\'s Watch mutineers', order: 7, branchId: null,
};
export const EVT_JON_RESURRECTED: TimelineEvent = {
  id: 'evt_jon_resurrected', projectId: P,
  name: 'Jon Snow resurrected by Melisandre', order: 8, branchId: null,
};
export const EVT_SEPT_DESTROYED: TimelineEvent = {
  id: 'evt_sept_destroyed', projectId: P,
  name: 'Cersei destroys the Great Sept of Baelor with wildfire; Tommen dies', order: 9, branchId: null,
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const BRANCH_MAIN: Branch = {
  id: 'branch_main', projectId: P, name: 'main', parentBranchId: null,
  description: 'Show canon timeline.',
};
export const BRANCH_ROBB_LIVES: Branch = {
  id: 'branch_robb_lives', projectId: P, name: 'Branch A — Robb lives', parentBranchId: 'branch_main',
  description: 'Alternate: Robb and Catelyn survive the Twins.',
};
export const BRANCH_CANON: Branch = {
  id: 'branch_canon', projectId: P, name: 'Branch B — Canon (show)', parentBranchId: 'branch_main',
  description: 'Show canon: Robb and Catelyn die at the Red Wedding.',
};

// ── Canon facts ───────────────────────────────────────────────────────────────

// ─ Dragons
export const FACT_NO_DRAGONS: CanonFact = {
  id: 'fact_no_dragons', projectId: P,
  text: 'No living dragons existed anywhere in the known world before Daenerys hatched her eggs.',
  factType: 'world_rule', entityIds: ['ent_dragons', 'ent_daenerys'], sourceId: S,
  sourceQuote: 'No living dragons existed anywhere until Daenerys Targaryen hatched three eggs in Essos.',
  confidence: 1.0, branchId: null, validityStartEventId: null, validityEndEventId: 'evt_dragons_hatched',
  epistemicStatus: 'objective',
};
export const FACT_DRAGONS_NEW: CanonFact = {
  id: 'fact_dragons_new', projectId: P,
  text: "Daenerys Targaryen's three dragons are the first living dragons in over a century. No living person had seen a dragon before they hatched. No lord or commoner grew up knowing living dragons.",
  factType: 'world_rule', entityIds: ['ent_dragons', 'ent_daenerys'], sourceId: S,
  sourceQuote: "Daenerys Targaryen hatched three dragon eggs in Essos — the first living dragons in over a hundred years.",
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_dragons_hatched', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Ned Stark
export const FACT_NED_DEAD: CanonFact = {
  id: 'fact_ned_dead', projectId: P,
  text: "Ned Stark was executed by beheading at King's Landing on order of King Joffrey. He is dead and cannot send or receive messages or take actions.",
  factType: 'character_state', entityIds: ['ent_ned'], sourceId: S,
  sourceQuote: "Ned Stark was executed at King's Landing.",
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_ned_executed', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Jaime
export const FACT_JAIME_HAND: CanonFact = {
  id: 'fact_jaime_hand', projectId: P,
  text: 'Jaime Lannister lost his right sword hand after being captured. He cannot grip, write, or fight with his right hand. He wears a golden prosthetic with no function.',
  factType: 'character_state', entityIds: ['ent_jaime'], sourceId: S,
  sourceQuote: 'Jaime Lannister lost his right sword hand after being captured.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_jaime_captured', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Robb and Catelyn (main canon — no branch restriction)
export const FACT_ROBB_DEAD: CanonFact = {
  id: 'fact_robb_dead', projectId: P,
  text: 'Robb Stark was assassinated at the Red Wedding at the Twins, stabbed by Roose Bolton. He is dead. He violated his oath to House Frey by marrying Talisa Maegyr.',
  factType: 'character_state', entityIds: ['ent_robb'], sourceId: S,
  sourceQuote: 'Robb Stark was killed at the Red Wedding at the Twins.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_CATELYN_DEAD: CanonFact = {
  id: 'fact_catelyn_dead', projectId: P,
  text: 'Catelyn Stark was killed at the Red Wedding at the Twins. Her body was thrown into the river. She is dead and cannot take actions or send messages.',
  factType: 'character_state', entityIds: ['ent_catelyn'], sourceId: S,
  sourceQuote: 'Catelyn Stark was killed at the Red Wedding at the Twins; her body was thrown into the river.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Robb-lives branch overrides
export const FACT_ROBB_LIVES: CanonFact = {
  id: 'fact_robb_lives', projectId: P,
  text: 'Robb Stark survived the massacre at the Twins (alternate branch).',
  factType: 'branch_state', entityIds: ['ent_robb'], sourceId: S,
  sourceQuote: 'In the branch where Robb Stark survived the massacre at the Twins.',
  confidence: 1.0, branchId: 'branch_robb_lives', validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_CATELYN_LIVES: CanonFact = {
  id: 'fact_catelyn_lives', projectId: P,
  text: 'Catelyn Stark survived the massacre at the Twins (alternate branch).',
  factType: 'branch_state', entityIds: ['ent_catelyn'], sourceId: S,
  sourceQuote: 'In the branch where Robb survived, Catelyn Stark also survived the massacre at the Twins.',
  confidence: 1.0, branchId: 'branch_robb_lives', validityStartEventId: 'evt_red_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Joffrey and Tommen
export const FACT_JOFFREY_DEAD: CanonFact = {
  id: 'fact_joffrey_dead', projectId: P,
  text: 'Joffrey Baratheon was poisoned and killed at his own wedding feast (the Purple Wedding). He is dead. Joffrey was the son of Cersei Lannister and Jaime Lannister, not Robert Baratheon.',
  factType: 'character_state', entityIds: ['ent_joffrey'], sourceId: S,
  sourceQuote: 'Joffrey Baratheon died of poisoning at his own wedding feast.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_purple_wedding', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_TOMMEN_DEAD: CanonFact = {
  id: 'fact_tommen_dead', projectId: P,
  text: 'Tommen Baratheon died by suicide after the destruction of the Great Sept of Baelor. He is dead.',
  factType: 'character_state', entityIds: ['ent_tommen'], sourceId: S,
  sourceQuote: 'Tommen Baratheon died by suicide after the destruction of the Great Sept of Baelor.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_sept_destroyed', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Jon Snow
export const FACT_JON_BASTARD: CanonFact = {
  id: 'fact_jon_bastard', projectId: P,
  text: "Jon Snow was raised as the bastard son of Ned Stark at Winterfell. His true parentage is Lyanna Stark and Rhaegar Targaryen, making him Aegon Targaryen, the legitimate heir to the Iron Throne.",
  factType: 'character_state', entityIds: ['ent_jon', 'ent_ned'], sourceId: S,
  sourceQuote: 'Jon Snow is the bastard son of Ned Stark; true parentage is Lyanna Stark and Rhaegar Targaryen.',
  confidence: 1.0, branchId: null, validityStartEventId: null, validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_JON_LORD_COMMANDER: CanonFact = {
  id: 'fact_jon_lc', projectId: P,
  text: "Jon Snow was elected Lord Commander of the Night's Watch.",
  factType: 'character_state', entityIds: ['ent_jon', 'ent_nights_watch'], sourceId: S,
  sourceQuote: "Jon Snow was elected Lord Commander of the Night's Watch.",
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_jon_lc', validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_JON_DEAD: CanonFact = {
  id: 'fact_jon_dead', projectId: P,
  text: "Jon Snow was stabbed to death by Night's Watch mutineers led by Alliser Thorne.",
  factType: 'character_state', entityIds: ['ent_jon'], sourceId: S,
  sourceQuote: "Jon Snow was stabbed to death by Night's Watch mutineers.",
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_jon_dies', validityEndEventId: 'evt_jon_resurrected',
  epistemicStatus: 'objective',
};
export const FACT_JON_ALIVE: CanonFact = {
  id: 'fact_jon_alive', projectId: P,
  text: 'Jon Snow was resurrected by Melisandre. He is alive after his resurrection.',
  factType: 'character_state', entityIds: ['ent_jon'], sourceId: S,
  sourceQuote: 'Jon Snow was resurrected by Melisandre.',
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_jon_resurrected', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ─ Travel and world rules
export const FACT_TRAVEL_TIME: CanonFact = {
  id: 'fact_travel_time', projectId: P,
  text: "Overland travel from Winterfell to King's Landing takes weeks of hard riding — it is hundreds of miles. No one can travel between them in a single day or overnight.",
  factType: 'world_rule', entityIds: ['ent_winterfell', 'ent_kings_landing'], sourceId: S,
  sourceQuote: "Overland travel from Winterfell to King's Landing takes weeks of hard riding, not a single day.",
  confidence: 1.0, branchId: null, validityStartEventId: null, validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_NIGHTS_WATCH_VOWS: CanonFact = {
  id: 'fact_nw_vows', projectId: P,
  text: "Night's Watch members take vows of celibacy, political neutrality, and renounce lands and titles. They cannot hold lands, take wives, or father children (with intent).",
  factType: 'world_rule', entityIds: ['ent_nights_watch'], sourceId: S,
  sourceQuote: "Night's Watch members take vows of celibacy and political neutrality.",
  confidence: 1.0, branchId: null, validityStartEventId: null, validityEndEventId: null,
  epistemicStatus: 'objective',
};
export const FACT_IRON_THRONE_DESTROYED: CanonFact = {
  id: 'fact_iron_throne_destroyed', projectId: P,
  text: 'The Iron Throne was destroyed by Drogon after Daenerys\'s death. It no longer exists.',
  factType: 'object_state', entityIds: ['ent_iron_throne'], sourceId: S,
  sourceQuote: "The Iron Throne was melted and destroyed by Drogon after Daenerys's death.",
  confidence: 1.0, branchId: null, validityStartEventId: 'evt_sept_destroyed', validityEndEventId: null,
  epistemicStatus: 'objective',
};

// ── Exports ───────────────────────────────────────────────────────────────────
export const ENTITIES = [
  ENTITY_JAIME, ENTITY_NED, ENTITY_ROBB, ENTITY_CATELYN, ENTITY_DAENERYS,
  ENTITY_JON, ENTITY_SANSA, ENTITY_ARYA, ENTITY_BRAN, ENTITY_RICKON,
  ENTITY_CERSEI, ENTITY_TYRION, ENTITY_JOFFREY, ENTITY_TOMMEN, ENTITY_ROBERT,
  ENTITY_MAESTER_LUWIN, ENTITY_WINTERFELL, ENTITY_KINGS_LANDING, ENTITY_THE_TWINS,
  ENTITY_THE_WALL, ENTITY_DRAGONS, ENTITY_NIGHTS_WATCH, ENTITY_IRON_THRONE,
];
export const EVENTS = [
  EVT_DRAGONS_HATCHED, EVT_NED_EXECUTED, EVT_JAIME_CAPTURED,
  EVT_RED_WEDDING, EVT_PURPLE_WEDDING, EVT_JON_LORD_COMMANDER,
  EVT_JON_DIES, EVT_JON_RESURRECTED, EVT_SEPT_DESTROYED,
];
export const BRANCHES = [BRANCH_MAIN, BRANCH_ROBB_LIVES, BRANCH_CANON];
export const FACTS = [
  FACT_NO_DRAGONS, FACT_DRAGONS_NEW,
  FACT_NED_DEAD, FACT_JAIME_HAND,
  FACT_ROBB_DEAD, FACT_CATELYN_DEAD,
  FACT_ROBB_LIVES, FACT_CATELYN_LIVES,
  FACT_JOFFREY_DEAD, FACT_TOMMEN_DEAD,
  FACT_JON_BASTARD, FACT_JON_LORD_COMMANDER, FACT_JON_DEAD, FACT_JON_ALIVE,
  FACT_TRAVEL_TIME, FACT_NIGHTS_WATCH_VOWS, FACT_IRON_THRONE_DESTROYED,
];
export const SOURCES = [SOURCE_SEED];

export const GOT_WORLD = {
  project: PROJECT,
  sources: SOURCES,
  entities: ENTITIES,
  events: EVENTS,
  branches: BRANCHES,
  facts: FACTS,
};
