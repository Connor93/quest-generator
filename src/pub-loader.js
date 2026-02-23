/**
 * pub-loader.js — Parse EO pub files using eolib
 * Supports EIF (items), ENF (NPCs), ESF (spells), ECF (classes)
 */
import { EoReader, Eif, Enf, Esf, Ecf } from 'eolib';

// ── Item Type Labels ──────────────────────────────────────────
const ITEM_TYPE_NAMES = {
  0: 'Static', 1: 'UnknownType1', 2: 'Money', 3: 'Heal', 4: 'Teleport',
  5: 'Spell', 6: 'EXPReward', 7: 'StatReward', 8: 'SkillReward',
  9: 'Key', 10: 'Weapon', 11: 'Shield', 12: 'Armor', 13: 'Hat',
  14: 'Boots', 15: 'Gloves', 16: 'Accessory', 17: 'Belt', 18: 'Necklace',
  19: 'Ring', 20: 'Armlet', 21: 'Bracer', 22: 'Beer', 23: 'EffectPotion',
  24: 'HairDye', 25: 'CureCurse',
};

const NPC_TYPE_NAMES = {
  0: 'NPC', 1: 'Passive', 2: 'Aggressive', 3: 'Unknown3',
  4: 'Unknown4', 5: 'Unknown5', 6: 'Shop', 7: 'Inn',
  8: 'Unknown8', 9: 'Bank', 10: 'Barber', 11: 'Guild',
  12: 'Priest', 13: 'Law', 14: 'Skills', 15: 'Quest',
};

const SPELL_TYPE_NAMES = {
  0: 'Heal', 1: 'Damage', 2: 'Bard',
};

// ── Parse Individual File Types ───────────────────────────────

export function parseEif(buffer) {
  const reader = new EoReader(new Uint8Array(buffer));
  const eif = Eif.deserialize(reader);

  return eif.items
    .filter(r => r.name && r.name.toLowerCase() !== 'eof')
    .map((r, i) => ({
      id: i + 1,
      name: r.name,
      type: r.type,
      typeName: ITEM_TYPE_NAMES[r.type] || `Type${r.type}`,
      subtype: r.subtype,
      hp: r.hp || 0,
      tp: r.tp || 0,
      minDamage: r.minDamage || 0,
      maxDamage: r.maxDamage || 0,
      accuracy: r.accuracy || 0,
      evade: r.evade || 0,
      armor: r.armor || 0,
      weight: r.weight || 0,
      levelRequirement: r.levelRequirement || 0,
      classRequirement: r.classRequirement || 0,
    }));
}

export function parseEnf(buffer) {
  const reader = new EoReader(new Uint8Array(buffer));
  const enf = Enf.deserialize(reader);

  return enf.npcs
    .filter(r => r.name && r.name.toLowerCase() !== 'eof')
    .map((r, i) => ({
      id: i + 1,
      name: r.name,
      type: r.type,
      typeName: NPC_TYPE_NAMES[r.type] || `Type${r.type}`,
      boss: r.boss,
      hp: r.hp || 0,
      tp: r.tp || 0,
      exp: r.experience || 0,
      level: r.level || 0,
      minDamage: r.minDamage || 0,
      maxDamage: r.maxDamage || 0,
      accuracy: r.accuracy || 0,
      evade: r.evade || 0,
      armor: r.armor || 0,
    }));
}

export function parseEsf(buffer) {
  const reader = new EoReader(new Uint8Array(buffer));
  const esf = Esf.deserialize(reader);

  return esf.skills
    .filter(r => r.name && r.name.toLowerCase() !== 'eof')
    .map((r, i) => ({
      id: i + 1,
      name: r.name,
      chant: r.chant || '',
      type: r.type,
      typeName: SPELL_TYPE_NAMES[r.type] || `Type${r.type}`,
      tpCost: r.tpCost || 0,
      spCost: r.spCost || 0,
      castTime: r.castTime || 0,
      minDamage: r.minDamage || 0,
      maxDamage: r.maxDamage || 0,
      hpHeal: r.hpHeal || 0,
      tpHeal: r.tpHeal || 0,
      targetType: r.targetType,
    }));
}

export function parseEcf(buffer) {
  const reader = new EoReader(new Uint8Array(buffer));
  const ecf = Ecf.deserialize(reader);

  return ecf.classes
    .filter(r => r.name && r.name.toLowerCase() !== 'eof')
    .map((r, i) => ({
      id: i + 1,
      name: r.name,
      parentType: r.parentType || 0,
      statGroup: r.statGroup || 0,
      str: r.str || 0,
      intl: r.intl || 0,
      wis: r.wis || 0,
      agi: r.agi || 0,
      con: r.con || 0,
      cha: r.cha || 0,
    }));
}

// ── Load Multiple Files ───────────────────────────────────────

/**
 * Accept a FileList from an <input> element, detect types by extension,
 * parse all, and return a GameDatabase object.
 */
export async function loadDataFiles(fileList) {
  const db = { items: null, npcs: null, spells: null, classes: null };
  const errors = [];

  for (const file of fileList) {
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      const buffer = await file.arrayBuffer();
      switch (ext) {
        case 'eif':
          db.items = parseEif(buffer);
          break;
        case 'enf':
          db.npcs = parseEnf(buffer);
          break;
        case 'esf':
          db.spells = parseEsf(buffer);
          break;
        case 'ecf':
          db.classes = parseEcf(buffer);
          break;
        default:
          errors.push(`Skipped unknown file type: ${file.name}`);
      }
    } catch (e) {
      errors.push(`Failed to parse ${file.name}: ${e.message}`);
    }
  }

  return { db, errors };
}

// ── LocalStorage Persistence ──────────────────────────────────

const STORAGE_KEY = 'questgen_pubdata';

export function saveToStorage(db) {
  try {
    const serializable = {};
    if (db.items) serializable.items = db.items;
    if (db.npcs) serializable.npcs = db.npcs;
    if (db.spells) serializable.spells = db.spells;
    if (db.classes) serializable.classes = db.classes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    return true;
  } catch (e) {
    console.warn('Failed to save pub data to storage:', e);
    return false;
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load pub data from storage:', e);
    return null;
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns a summary string for loaded data.
 */
export function getDataSummary(db) {
  const parts = [];
  if (db.items) parts.push(`${db.items.length} items`);
  if (db.npcs) parts.push(`${db.npcs.length} NPCs`);
  if (db.spells) parts.push(`${db.spells.length} spells`);
  if (db.classes) parts.push(`${db.classes.length} classes`);
  return parts.length > 0 ? parts.join(', ') : 'No data loaded';
}
