/**
 * Complete EQF quest format reference data.
 * All actions, rules, argument specs, and common constants for the EOPlus scripting language.
 */

export const ACTIONS = [
  { name: 'SetState', args: [{ name: 'state', type: 'string' }], desc: 'Jump to a named state' },
  { name: 'Reset', args: [], desc: 'Reset quest to beginning (or done if completed daily)' },
  { name: 'ResetDaily', args: [], desc: 'Reset with daily completion tracking' },
  { name: 'End', args: [], desc: 'Permanently end quest (non-repeatable)' },
  { name: 'StartQuest', args: [{ name: 'quest_id', type: 'int' }, { name: 'state', type: 'string', optional: true }], desc: 'Start another quest' },
  { name: 'ResetQuest', args: [{ name: 'quest_id', type: 'int' }], desc: 'Reset another quest' },
  { name: 'SetQuestState', args: [{ name: 'quest_id', type: 'int' }, { name: 'state', type: 'string' }], desc: 'Set another quest\'s state' },
  { name: 'AddNpcText', args: [{ name: 'vendor_id', type: 'int' }, { name: 'text', type: 'string' }], desc: 'Add dialog text for NPC conversation' },
  { name: 'AddNpcInput', args: [{ name: 'vendor_id', type: 'int' }, { name: 'link_id', type: 'int' }, { name: 'text', type: 'string' }], desc: 'Add clickable dialog choice' },
  { name: 'AddNpcChat', args: [{ name: 'vendor_id', type: 'int' }, { name: 'text', type: 'string' }], desc: 'NPC chat bubble (shown outside quest dialog)' },
  { name: 'AddNpcPM', args: [{ name: 'vendor_id', type: 'int' }, { name: 'text', type: 'string' }], desc: 'Private message from NPC' },
  { name: 'ShowHint', args: [{ name: 'text', type: 'string' }], desc: 'Show status bar message to player' },
  { name: 'Quake', args: [{ name: 'strength', type: 'int', optional: true }], desc: 'Screen shake on current map (1-8)' },
  { name: 'QuakeWorld', args: [{ name: 'strength', type: 'int', optional: true }], desc: 'Screen shake on all maps' },
  { name: 'SetMap', args: [{ name: 'map_id', type: 'int' }, { name: 'x', type: 'int' }, { name: 'y', type: 'int' }], desc: 'Warp player to map coordinate' },
  { name: 'SetCoord', args: [{ name: 'map_id', type: 'int' }, { name: 'x', type: 'int' }, { name: 'y', type: 'int' }], desc: 'Warp player to coordinate (alias for SetMap)' },
  { name: 'ReturnHome', args: [], desc: 'Warp player to their home town' },
  { name: 'PlaySound', args: [{ name: 'sound_id', type: 'int' }], desc: 'Play a sound effect' },
  { name: 'PlayEffect', args: [{ name: 'effect_id', type: 'int' }], desc: 'Play a visual effect' },
  { name: 'GiveEXP', args: [{ name: 'amount', type: 'int' }], desc: 'Grant experience points (modified by server EXP rate)' },
  { name: 'GiveItem', args: [{ name: 'item_id', type: 'int' }, { name: 'amount', type: 'int', optional: true }], desc: 'Give item to player (default amount: 1)' },
  { name: 'RemoveItem', args: [{ name: 'item_id', type: 'int' }, { name: 'amount', type: 'int', optional: true }], desc: 'Remove item from player' },
  { name: 'SetClass', args: [{ name: 'class_id', type: 'int' }], desc: 'Change player class' },
  { name: 'SetRace', args: [{ name: 'race_id', type: 'int' }], desc: 'Change player skin/race' },
  { name: 'RemoveKarma', args: [{ name: 'amount', type: 'int' }], desc: 'Remove karma points' },
  { name: 'GiveKarma', args: [{ name: 'amount', type: 'int' }], desc: 'Grant karma points' },
  { name: 'SpawnNPC', args: [{ name: 'npc_id', type: 'int' }, { name: 'amount', type: 'int' }], desc: 'Spawn NPCs on current map' },
  { name: 'SetTitle', args: [{ name: 'title', type: 'string' }], desc: 'Set player title' },
  { name: 'SetFiance', args: [{ name: 'name', type: 'string' }], desc: 'Set player fiance' },
  { name: 'SetPartner', args: [{ name: 'name', type: 'string' }], desc: 'Set player partner' },
  { name: 'SetHome', args: [{ name: 'town', type: 'string' }], desc: 'Set player home town' },
  { name: 'SetStat', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Set a stat to a value' },
  { name: 'GiveStat', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Add to a stat' },
  { name: 'RemoveStat', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Subtract from a stat' },
  { name: 'NewAchievement', args: [{ name: 'name', type: 'string' }], desc: 'Grant achievement' },
  { name: 'Roll', args: [{ name: 'max', type: 'int' }], desc: 'Random roll 1 to max, use with Rolled rule' },
  { name: 'GivePartyItem', args: [{ name: 'item_id', type: 'int' }, { name: 'amount', type: 'int' }], desc: 'Give item to all party members' },
  { name: 'GivePartyEXP', args: [{ name: 'amount', type: 'int' }], desc: 'Give EXP to all party members' },
  { name: 'PartyWarp', args: [{ name: 'map_id', type: 'int' }, { name: 'x', type: 'int' }, { name: 'y', type: 'int' }], desc: 'Warp entire party' },
];

export const RULES = [
  { name: 'InputNpc', args: [{ name: 'link_id', type: 'int' }], desc: 'Player chose dialog option with this link_id' },
  { name: 'TalkedToNpc', args: [{ name: 'vendor_id', type: 'int' }], desc: 'Player talked to NPC (no dialog choices)' },
  { name: 'Always', args: [], desc: 'Always true - immediate transition' },
  { name: 'DoneDaily', args: [{ name: 'count', type: 'int' }], desc: 'Completed daily quest N times' },
  { name: 'DoneMonthDay', args: [{ name: 'day', type: 'int' }, { name: 'count', type: 'int' }], desc: 'Completed on specific day of month' },
  { name: 'EnterMap', args: [{ name: 'map_id', type: 'int' }], desc: 'Player is on this map' },
  { name: 'EnterCoord', args: [{ name: 'map_id', type: 'int' }, { name: 'x', type: 'int' }, { name: 'y', type: 'int' }], desc: 'Player is at exact coordinate' },
  { name: 'LeaveMap', args: [{ name: 'map_id', type: 'int' }], desc: 'Player is NOT on this map' },
  { name: 'LeaveCoord', args: [{ name: 'map_id', type: 'int' }, { name: 'x', type: 'int' }, { name: 'y', type: 'int' }], desc: 'Player is NOT at this coordinate' },
  { name: 'IsLeader', args: [], desc: 'Player is party leader' },
  { name: 'InParty', args: [], desc: 'Player is in a party' },
  { name: 'KilledNpcs', args: [{ name: 'npc_id', type: 'int' }, { name: 'count', type: 'int', optional: true }], desc: 'Killed N of this NPC type' },
  { name: 'KilledPlayers', args: [{ name: 'count', type: 'int' }], desc: 'Killed N players in PK' },
  { name: 'ArenaKills', args: [{ name: 'count', type: 'int' }], desc: 'Arena kill count' },
  { name: 'ArenaWins', args: [{ name: 'count', type: 'int' }], desc: 'Arena win count' },
  { name: 'GotItems', args: [{ name: 'item_id', type: 'int' }, { name: 'count', type: 'int', optional: true }], desc: 'Player has N of this item' },
  { name: 'LostItems', args: [{ name: 'item_id', type: 'int' }, { name: 'count', type: 'int', optional: true }], desc: 'Player has fewer than N of this item' },
  { name: 'UsedItem', args: [{ name: 'item_id', type: 'int' }, { name: 'count', type: 'int', optional: true }], desc: 'Player used item N times' },
  { name: 'IsGender', args: [{ name: 'gender_id', type: 'int' }], desc: 'Gender check (0=female, 1=male)' },
  { name: 'IsLevel', args: [{ name: 'level', type: 'int' }], desc: 'Minimum level check' },
  { name: 'IsRebirth', args: [{ name: 'rebirth', type: 'int' }], desc: 'Rebirth count check' },
  { name: 'IsParty', args: [{ name: 'count', type: 'int' }], desc: 'Party has at least N members' },
  { name: 'IsRace', args: [{ name: 'race_id', type: 'int' }], desc: 'Race/skin check' },
  { name: 'IsWearing', args: [{ name: 'item_id', type: 'int' }], desc: 'Player is wearing this equipment' },
  { name: 'IsQuestState', args: [{ name: 'quest_id', type: 'int' }, { name: 'state', type: 'string' }], desc: 'Another quest is in a specific state' },
  { name: 'GotSpell', args: [{ name: 'spell_id', type: 'int' }, { name: 'level', type: 'int', optional: true }], desc: 'Player knows spell at level' },
  { name: 'LostSpell', args: [{ name: 'spell_id', type: 'int' }], desc: 'Player does not know spell' },
  { name: 'UsedSpell', args: [{ name: 'spell_id', type: 'int' }, { name: 'count', type: 'int', optional: true }], desc: 'Player used spell N times' },
  { name: 'CitizenOf', args: [{ name: 'town', type: 'string' }], desc: 'Player is citizen of town' },
  { name: 'Class', args: [{ name: 'class_id', type: 'int' }], desc: 'Player is this class' },
  { name: 'LostClass', args: [{ name: 'class_id', type: 'int' }], desc: 'Player is NOT this class' },
  { name: 'StatIs', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Stat equals value' },
  { name: 'StatNot', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Stat not equal to value' },
  { name: 'StatGreater', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Stat greater than value' },
  { name: 'StatLess', args: [{ name: 'stat', type: 'string' }, { name: 'value', type: 'int' }], desc: 'Stat less than value' },
  { name: 'StatBetween', args: [{ name: 'stat', type: 'string' }, { name: 'min', type: 'int' }, { name: 'max', type: 'int' }], desc: 'Stat between min and max' },
  { name: 'StatRpn', args: [{ name: 'expression', type: 'string' }], desc: 'RPN stat expression' },
  { name: 'Rolled', args: [{ name: 'min', type: 'int' }, { name: 'max', type: 'int', optional: true }], desc: 'Roll result check' },
];

export const SOUND_IDS = {
  HINT_NOTIFICATION: 18,
  WARNING: 17,
  QUEST_COMPLETE: 97,
};

export const STAT_NAMES = [
  'level', 'exp', 'str', 'int', 'wis', 'agi', 'con', 'cha',
  'statpoints', 'skillpoints', 'admin', 'gender', 'hairstyle',
  'haircolor', 'race', 'guildrank', 'karma', 'class',
];

export const MAIN_BLOCK_OPTIONS = [
  { name: 'questname', type: 'string', required: true, desc: 'Display name of the quest' },
  { name: 'version', type: 'int', required: true, desc: 'Quest version number' },
  { name: 'hidden', type: 'flag', required: false, desc: 'Quest does not show in quest book' },
  { name: 'hidden_end', type: 'flag', required: false, desc: 'Quest hidden only after completion' },
  { name: 'disabled', type: 'flag', required: false, desc: 'Quest is disabled and cannot progress' },
];

export const ITEM_TYPES = [
  'Static', 'Money', 'Heal', 'Teleport', 'Transform', 'EXPReward',
  'SkillReward', 'Visual', 'Key', 'Weapon', 'Shield', 'Armor',
  'Hat', 'Boots', 'Gloves', 'Accessory', 'Belt', 'Necklace',
  'Ring', 'Armlet', 'Bracer', 'Beer', 'EffectPotion', 'HairDye',
  'CureCurse', 'Title',
];

export const NPC_TYPES = [
  'NPC', 'Passive', 'Aggressive', 'Pet', 'NPCMine', 'NPCKiller',
  'Shop', 'Inn', 'Bank', 'Barber', 'Guild', 'Priest', 'Law',
  'Skills', 'Quest',
];

/**
 * Build the system prompt for Gemini with the complete EQF reference.
 */
export function buildSystemPrompt(referenceData) {
  return `You are an expert quest designer for an MMORPG that uses the EOPlus scripting language. You generate complete, valid .eqf quest files.

## EQF FORMAT

Quest files use this structure:

\`\`\`
Main
{
  questname  "Quest Name Here"
  version    1
}

state Begin
{
  desc       "Description shown in quest book"

  action     AddNpcText(vendor_id, "Dialog text here");
  action     AddNpcInput(vendor_id, link_id, "Choice text");

  rule       InputNpc(link_id) goto NextStateName
}
\`\`\`

### KEY RULES:
1. Every quest MUST have a Main block with questname and version
2. Every quest MUST start with a "state Begin" block
3. States contain: desc (optional), actions, and rules
4. Actions are executed when entering a state
5. Rules define transitions: when condition is met, goto target state
6. AddNpcText adds dialog pages, AddNpcInput adds clickable choices
7. AddNpcChat sets what NPC says outside quest dialog
8. vendor_id identifies which NPC the dialog belongs to
9. link_id in AddNpcInput must match InputNpc rules
10. Use ShowHint for status bar messages
11. PlaySound(18) for hint notifications, PlaySound(17) for warnings, PlaySound(97) for quest completion
12. Use [name] in dialog text to insert the player's name
13. End() permanently ends a quest, Reset() makes it restartable
14. Use SetMap(map_id, x, y) to warp the player
15. Indentation uses tabs
16. Semicolons at end of action and rule lines are standard but optional

### AVAILABLE ACTIONS:
${ACTIONS.map(a => `- ${a.name}(${a.args.map(arg => arg.optional ? `[${arg.name}]` : arg.name).join(', ')}) — ${a.desc}`).join('\n')}

### AVAILABLE RULES:
${RULES.map(r => `- ${r.name}(${r.args.map(arg => arg.optional ? `[${arg.name}]` : arg.name).join(', ')}) goto StateName — ${r.desc}`).join('\n')}

### CONDITIONALS IN ACTIONS:
You can wrap actions in if/elseif/else blocks:
\`\`\`
if Class(1) GiveItem(4, 10);
elseif Class(2) GiveItem(5, 10);
else GiveItem(1, 5000);
\`\`\`

### COMMON PATTERNS:
- Dialog choices: AddNpcInput + InputNpc rule pairs
- Kill quest tracking: KilledNpcs(npc_id, count) rule
- Item collection: GotItems(item_id, count) rule, RemoveItem on turn-in
- Always use a Reset state: \`state Reset { action Reset() }\`
- Reward states should use ShowHint, PlaySound(97), then End()
- Use ShowHint("Quest reward: X EXP!") early to tell player the reward

### STYLE GUIDELINES:
- Write immersive, character-appropriate NPC dialog
- Use [name] to address the player personally
- Give NPCs distinct personalities through dialog style
- Break long dialog into multiple AddNpcText calls
- Always offer accept/decline choices at quest start
- Add ShowHint messages at key transitions
- Use PlaySound(18) after major state transitions
- State names should be PascalCase and descriptive

${referenceData ? `### REFERENCE DATA:\n${referenceData}` : ''}

IMPORTANT: Output ONLY the .eqf file content. No markdown fences, no explanation, just the raw quest file.`;
}
