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
