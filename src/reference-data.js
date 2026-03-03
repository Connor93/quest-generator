/**
 * Reference data for game entities.
 * Supports both curated fallback data and dynamically loaded pub file data.
 */

// ── Default Curated Data (fallback) ─────────────────────────────

const DEFAULT_NPCS = [
  { id: 1, name: 'Pjedro', type: 6, typeName: 'Shop', location: 'Starting Area' },
  { id: 3, name: 'Merriad', type: 15, typeName: 'Quest', location: 'Starting Area' },
  { id: 5, name: 'Old Pirate', type: 15, typeName: 'Quest', location: 'Port' },
  { id: 6, name: 'Pirate Captain Tobias', type: 15, typeName: 'Quest', location: 'Pirate Ship' },
  { id: 9, name: 'Nena', type: 15, typeName: 'Quest', location: 'Stronghold' },
  { id: 10, name: 'Swamp Guard', type: 15, typeName: 'Quest', location: 'Stronghold Swamp' },
  { id: 26, name: 'Wraith Guardian', type: 15, typeName: 'Quest', location: 'Wraith Area' },
  { id: 118, name: 'Octo', type: 2, typeName: 'Aggressive', hp: 500, exp: 120 },
  { id: 142, name: 'Apozen', type: 2, typeName: 'Aggressive', hp: 5000, exp: 2000, boss: true },
  { id: 170, name: 'Sheep', type: 1, typeName: 'Passive', hp: 20, exp: 5 },
];

const DEFAULT_ITEMS = [
  { id: 1, name: 'Gold', type: 2, typeName: 'Money' },
  { id: 211, name: 'Big Fairy Soda', type: 3, typeName: 'Heal' },
  { id: 242, name: 'Wraith Key', type: 9, typeName: 'Key' },
  { id: 253, name: 'Snake Tooth', type: 0, typeName: 'Static' },
  { id: 321, name: 'Wurm Head', type: 0, typeName: 'Static' },
  { id: 400, name: 'Imp Sting', type: 0, typeName: 'Static' },
  { id: 412, name: 'Old Treasure Map', type: 0, typeName: 'Static' },
  { id: 470, name: 'Dragon Wing', type: 0, typeName: 'Static' },
];

const DEFAULT_CLASSES = [
  { id: 1, name: 'Warrior', str: 3, intl: 0, wis: 0, agi: 1, con: 2, cha: 0 },
  { id: 2, name: 'Mage', str: 0, intl: 3, wis: 2, agi: 0, con: 0, cha: 1 },
  { id: 3, name: 'Archer', str: 1, intl: 0, wis: 0, agi: 3, con: 1, cha: 1 },
  { id: 4, name: 'Rogue', str: 1, intl: 0, wis: 0, agi: 3, con: 0, cha: 2 },
];

const DEFAULT_SPELLS = [];

export const SOUNDS = [
  { id: 17, name: 'Warning / Failure', usage: 'Quest failed, danger' },
  { id: 18, name: 'Notification / Hint', usage: 'New objective, state transition' },
  { id: 97, name: 'Quest Complete', usage: 'Quest completion reward' },
];

// ── Mutable Active Data ─────────────────────────────────────────

let activeNpcs = DEFAULT_NPCS;
let activeItems = DEFAULT_ITEMS;
let activeClasses = DEFAULT_CLASSES;
let activeSpells = DEFAULT_SPELLS;
let customDataLoaded = false;

// ── Getters ─────────────────────────────────────────────────────

export function getNpcs() { return activeNpcs; }
export function getItems() { return activeItems; }
export function getClasses() { return activeClasses; }
export function getSpells() { return activeSpells; }
export function isCustomDataLoaded() { return customDataLoaded; }

// ── Set Parsed Game Data ────────────────────────────────────────

/**
 * Replace active data with parsed pub file data.
 * Only replaces categories that were actually parsed.
 */
export function setGameData(db) {
  if (db.npcs && db.npcs.length > 0) activeNpcs = db.npcs;
  if (db.items && db.items.length > 0) activeItems = db.items;
  if (db.classes && db.classes.length > 0) activeClasses = db.classes;
  if (db.spells && db.spells.length > 0) activeSpells = db.spells;
  customDataLoaded = !!(db.npcs || db.items || db.classes || db.spells);
}

/**
 * Reset all data back to curated defaults.
 */
export function resetToDefaults() {
  activeNpcs = DEFAULT_NPCS;
  activeItems = DEFAULT_ITEMS;
  activeClasses = DEFAULT_CLASSES;
  activeSpells = DEFAULT_SPELLS;
  customDataLoaded = false;
}

// ── Search ──────────────────────────────────────────────────────

export function searchAll(query) {
  const q = query.toLowerCase();
  const results = [];

  for (const npc of activeNpcs) {
    if (npc.name.toLowerCase().includes(q) || String(npc.id) === q) {
      results.push({ category: 'NPC', ...npc });
    }
  }
  for (const item of activeItems) {
    if (item.name.toLowerCase().includes(q) || String(item.id) === q) {
      results.push({ category: 'Item', ...item });
    }
  }
  for (const spell of activeSpells) {
    if (spell.name.toLowerCase().includes(q) || String(spell.id) === q) {
      results.push({ category: 'Spell', ...spell });
    }
  }
  for (const cls of activeClasses) {
    if (cls.name.toLowerCase().includes(q) || String(cls.id) === q) {
      results.push({ category: 'Class', ...cls });
    }
  }
  return results;
}

/**
 * Score how well a query matches a candidate name.
 * Higher = better match. Returns 0 for no match.
 */
function matchScore(query, candidateName) {
  const q = query.toLowerCase();
  const c = candidateName.toLowerCase();

  // Exact match
  if (q === c) return 100;

  // Query matches start of candidate or vice versa
  if (c.startsWith(q) || q.startsWith(c)) return 80;

  // Substring match
  if (c.includes(q) || q.includes(c)) return 60;

  // Word overlap — how many words in the query appear in the candidate
  const qWords = q.split(/\s+/);
  const cWords = c.split(/\s+/);
  const overlap = qWords.filter(w => cWords.some(cw => cw.includes(w) || w.includes(cw)));
  if (overlap.length > 0) {
    return 40 * (overlap.length / qWords.length);
  }

  return 0;
}

/**
 * Extract potential entity names from a user prompt and find best matches
 * from the loaded reference data. Returns pre-resolved matches the AI should use.
 *
 * @param {string} prompt - The user's natural language quest description
 * @returns {string} A formatted string of pre-resolved entity matches
 */
export function resolveEntities(prompt) {
  // Common words to ignore when generating n-grams
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'that', 'this',
    'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you',
    'your', 'he', 'she', 'they', 'them', 'their', 'who', 'what', 'where',
    'when', 'how', 'which', 'about', 'up', 'out', 'so', 'if', 'then',
    'than', 'too', 'very', 'just', 'also', 'not', 'no', 'yes', 'all',
    'each', 'every', 'some', 'any', 'make', 'create', 'quest', 'give',
    'talk', 'go', 'get', 'kill', 'collect', 'find', 'bring', 'deliver',
    'return', 'need', 'want', 'ask', 'tell', 'said', 'say', 'player',
    'npc', 'item', 'monster', 'reward', 'exp',
  ]);

  // Generate n-grams (1 to 4 words) from the prompt
  const words = prompt.split(/\s+/).filter(w => w.length > 0);
  const ngrams = new Set();

  for (let n = 1; n <= Math.min(4, words.length); n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ');
      // Skip if it's only stop words
      const gramWords = gram.toLowerCase().split(/\s+/);
      if (gramWords.every(w => stopWords.has(w))) continue;
      // Skip very short single-word grams (likely not entity names)
      if (n === 1 && gram.length < 3) continue;
      ngrams.add(gram);
    }
  }

  // Search all entity lists for matches
  const allEntities = [
    ...activeNpcs.map(e => ({ ...e, category: 'NPC' })),
    ...activeItems.map(e => ({ ...e, category: 'Item' })),
    ...activeSpells.map(e => ({ ...e, category: 'Spell' })),
    ...activeClasses.map(e => ({ ...e, category: 'Class' })),
  ];

  // For each n-gram, find best matching entity
  const matches = [];
  const seenIds = new Set();

  for (const gram of ngrams) {
    let bestMatch = null;
    let bestScore = 0;

    for (const entity of allEntities) {
      const score = matchScore(gram, entity.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...entity, score, matchedQuery: gram };
      }
    }

    // Only include matches with a reasonable score
    if (bestMatch && bestScore >= 40) {
      const key = `${bestMatch.category}:${bestMatch.id}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        matches.push(bestMatch);
      }
    }
  }

  if (matches.length === 0) return '';

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Format as a string for the AI prompt
  let out = 'PRE-RESOLVED ENTITY MATCHES (use these exact IDs):\n';
  out += matches.map(m => {
    const details = [];
    if (m.typeName) details.push(m.typeName);
    if (m.hp) details.push(`HP:${m.hp}`);
    if (m.exp) details.push(`EXP:${m.exp}`);
    return `  ⭐ "${m.matchedQuery}" → ${m.category} ID ${m.id}: ${m.name} (${details.join(', ') || m.category})`;
  }).join('\n');

  return out;
}

/**
 * Build a reference data string for the Gemini system prompt.
 * With custom data, includes up to 200 of each for context.
 */
export function buildReferenceString() {
  const maxEntries = customDataLoaded ? 200 : activeNpcs.length;
  let out = 'Known NPCs:\n';
  out += activeNpcs.slice(0, maxEntries)
    .map(n => `  ID ${n.id}: ${n.name} (${n.typeName || 'Unknown'})${n.hp ? ` HP:${n.hp}` : ''}`)
    .join('\n');

  out += '\n\nKnown Items:\n';
  out += activeItems.slice(0, maxEntries)
    .map(i => `  ID ${i.id}: ${i.name} (${i.typeName || 'Unknown'})`)
    .join('\n');

  if (activeSpells.length > 0) {
    out += '\n\nKnown Spells:\n';
    out += activeSpells.slice(0, maxEntries)
      .map(s => `  ID ${s.id}: ${s.name} (${s.typeName || 'Unknown'})${s.tpCost ? ` TP:${s.tpCost}` : ''}`)
      .join('\n');
  }

  out += '\n\nClasses:\n';
  out += activeClasses.slice(0, maxEntries)
    .map(c => `  ID ${c.id}: ${c.name}`)
    .join('\n');

  return out;
}
