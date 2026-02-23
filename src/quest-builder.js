/**
 * Quest Builder - Template-based quest generation (fallback when no API key).
 */

export const TEMPLATES = [
  {
    id: 'kill',
    name: 'Kill Quest',
    icon: '⚔️',
    desc: 'Talk to NPC → Kill monsters → Return for reward',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Monster Hunt' },
      { key: 'npcVendorId', label: 'Quest NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcName', label: 'NPC Name', type: 'text', default: 'Hunter' },
      { key: 'monsterNpcId', label: 'Monster NPC ID', type: 'number', default: 170 },
      { key: 'monsterName', label: 'Monster Name', type: 'text', default: 'Sheep' },
      { key: 'killCount', label: 'Kill Count', type: 'number', default: 20 },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 5000 },
    ],
  },
  {
    id: 'fetch',
    name: 'Fetch Quest',
    icon: '📦',
    desc: 'Talk to NPC → Collect items → Return for reward',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Supply Run' },
      { key: 'npcVendorId', label: 'Quest NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcName', label: 'NPC Name', type: 'text', default: 'Merchant' },
      { key: 'itemId', label: 'Item ID', type: 'number', default: 211 },
      { key: 'itemName', label: 'Item Name', type: 'text', default: 'Big Fairy Soda' },
      { key: 'itemCount', label: 'Item Count', type: 'number', default: 10 },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 3000 },
    ],
  },
  {
    id: 'delivery',
    name: 'Delivery Quest',
    icon: '📜',
    desc: 'Get item from NPC A → Deliver to NPC B → Return for reward',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Special Delivery' },
      { key: 'npcAVendorId', label: 'Start NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcAName', label: 'Start NPC Name', type: 'text', default: 'Pjedro' },
      { key: 'npcBVendorId', label: 'Destination NPC Vendor ID', type: 'number', default: 3 },
      { key: 'npcBName', label: 'Destination NPC Name', type: 'text', default: 'Merriad' },
      { key: 'itemId', label: 'Delivery Item ID', type: 'number', default: 412 },
      { key: 'itemName', label: 'Delivery Item Name', type: 'text', default: 'Package' },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 4000 },
    ],
  },
  {
    id: 'explore',
    name: 'Exploration Quest',
    icon: '🗺️',
    desc: 'Talk to NPC → Visit location → Return for reward',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Uncharted Territory' },
      { key: 'npcVendorId', label: 'Quest NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcName', label: 'NPC Name', type: 'text', default: 'Explorer' },
      { key: 'targetMapId', label: 'Target Map ID', type: 'number', default: 228 },
      { key: 'targetMapName', label: 'Target Location Name', type: 'text', default: 'Vulture Island' },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 6000 },
    ],
  },
  {
    id: 'boss',
    name: 'Boss Quest',
    icon: '💀',
    desc: 'Talk to NPC → Find boss area → Kill boss → Return for reward',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Slay the Beast' },
      { key: 'npcVendorId', label: 'Quest NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcName', label: 'NPC Name', type: 'text', default: 'Commander' },
      { key: 'bossNpcId', label: 'Boss NPC ID', type: 'number', default: 142 },
      { key: 'bossName', label: 'Boss Name', type: 'text', default: 'Apozen' },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 15000 },
      { key: 'itemRewardId', label: 'Item Reward ID (0 for none)', type: 'number', default: 0 },
    ],
  },
  {
    id: 'daily',
    name: 'Daily Quest',
    icon: '🔄',
    desc: 'Repeatable daily quest with kill or fetch objectives',
    params: [
      { key: 'questName', label: 'Quest Name', type: 'text', default: 'Daily Patrol' },
      { key: 'npcVendorId', label: 'Quest NPC Vendor ID', type: 'number', default: 1 },
      { key: 'npcName', label: 'NPC Name', type: 'text', default: 'Guard Captain' },
      { key: 'monsterNpcId', label: 'Monster NPC ID', type: 'number', default: 170 },
      { key: 'monsterName', label: 'Monster Name', type: 'text', default: 'Sheep' },
      { key: 'killCount', label: 'Kill Count', type: 'number', default: 10 },
      { key: 'expReward', label: 'EXP Reward', type: 'number', default: 2000 },
    ],
  },
];

/**
 * Generate EQF from a template with filled parameters.
 */
export function generateFromTemplate(templateId, params) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  switch (templateId) {
    case 'kill': return generateKillQuest(params);
    case 'fetch': return generateFetchQuest(params);
    case 'delivery': return generateDeliveryQuest(params);
    case 'explore': return generateExploreQuest(params);
    case 'boss': return generateBossQuest(params);
    case 'daily': return generateDailyQuest(params);
    default: throw new Error(`No generator for template: ${templateId}`);
  }
}

function generateKillQuest(p) {
  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcName}"

\taction\t\tShowHint("Quest reward: ${p.expReward} EXP!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Greetings, [name]! I need your help with something.");
\taction\t\tAddNpcText(${p.npcVendorId}, "There are too many ${p.monsterName}s around here. Could you help thin them out?");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "I'll help you out!");
\taction\t\tAddNpcInput(${p.npcVendorId}, 2, "Sorry, not right now.");

\trule\t\tInputNpc(1) goto Hunt
\trule\t\tInputNpc(2) goto Reset
}

state Hunt
{
\tdesc\t\t"Kill ${p.killCount} ${p.monsterName}s"

\taction\t\tShowHint("Kill ${p.killCount} ${p.monsterName}s and return to ${p.npcName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "How is the hunt going, [name]?");
\taction\t\tAddNpcChat(${p.npcVendorId}, "Good luck out there!");

\trule\t\tKilledNpcs(${p.monsterNpcId}, ${p.killCount}) goto Return
}

state Return
{
\tdesc\t\t"Return to ${p.npcName}"

\taction\t\tShowHint("You've killed ${p.killCount} ${p.monsterName}s! Return to ${p.npcName}.");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "Excellent work, [name]! You've really helped keep the area safe.");
\taction\t\tAddNpcText(${p.npcVendorId}, "Please accept this reward as thanks for your efforts!");

\trule\t\tTalkedToNpc(${p.npcVendorId}) goto Reward
}

state Reward
{
\taction\t\tGiveEXP(${p.expReward});
\taction\t\tShowHint("[Quest Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tEnd();
}

state Reset
{
\taction\t\tAddNpcText(${p.npcVendorId}, "That's too bad. Come back if you change your mind!");
\taction\t\tReset();
}`;
}

function generateFetchQuest(p) {
  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcName}"

\taction\t\tShowHint("Quest reward: ${p.expReward} EXP!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Hello there, [name]! I'm in need of some supplies.");
\taction\t\tAddNpcText(${p.npcVendorId}, "Could you bring me ${p.itemCount} ${p.itemName}? I'll make it worth your while!");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "Sure, I'll get them for you!");
\taction\t\tAddNpcInput(${p.npcVendorId}, 2, "Not right now, sorry.");

\trule\t\tInputNpc(1) goto Collect
\trule\t\tInputNpc(2) goto Reset
}

state Collect
{
\tdesc\t\t"Collect ${p.itemCount} ${p.itemName}"

\taction\t\tShowHint("Collect ${p.itemCount} ${p.itemName} and return to ${p.npcName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "Have you found the ${p.itemName} yet, [name]?");
\taction\t\tAddNpcChat(${p.npcVendorId}, "I really need those supplies!");

\trule\t\tGotItems(${p.itemId}, ${p.itemCount}) goto TurnIn
}

state TurnIn
{
\tdesc\t\t"Return to ${p.npcName}"

\taction\t\tShowHint("You have ${p.itemCount} ${p.itemName}! Return to ${p.npcName}.");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "Wonderful, [name]! You found them all!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Here is your reward, thank you so much!");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "Hand over the items");

\trule\t\tInputNpc(1) goto Reward
\trule\t\tLostItems(${p.itemId}, ${p.itemCount}) goto Collect
}

state Reward
{
\taction\t\tRemoveItem(${p.itemId}, ${p.itemCount});
\taction\t\tGiveEXP(${p.expReward});
\taction\t\tShowHint("[Quest Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tEnd();
}

state Reset
{
\taction\t\tAddNpcText(${p.npcVendorId}, "No worries, come back anytime!");
\taction\t\tReset();
}`;
}

function generateDeliveryQuest(p) {
  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcAName}"

\taction\t\tShowHint("Quest reward: ${p.expReward} EXP!");
\taction\t\tAddNpcText(${p.npcAVendorId}, "Hello [name]! I need someone to deliver a ${p.itemName} to ${p.npcBName}.");
\taction\t\tAddNpcText(${p.npcAVendorId}, "Can you do this for me?");

\taction\t\tAddNpcInput(${p.npcAVendorId}, 1, "Sure, I'll deliver it!");
\taction\t\tAddNpcInput(${p.npcAVendorId}, 2, "I'm too busy right now.");

\trule\t\tInputNpc(1) goto GotPackage
\trule\t\tInputNpc(2) goto Reset
}

state GotPackage
{
\tdesc\t\t"Deliver ${p.itemName} to ${p.npcBName}"

\taction\t\tGiveItem(${p.itemId});
\taction\t\tShowHint("Deliver the ${p.itemName} to ${p.npcBName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcChat(${p.npcAVendorId}, "Please hurry with that delivery!");
\taction\t\tAddNpcText(${p.npcBVendorId}, "Oh, is that the ${p.itemName} from ${p.npcAName}? Thank you, [name]!");

\trule\t\tTalkedToNpc(${p.npcBVendorId}) goto Delivered
\trule\t\tLostItems(${p.itemId}) goto LostPackage
}

state Delivered
{
\tdesc\t\t"Return to ${p.npcAName}"

\taction\t\tRemoveItem(${p.itemId});
\taction\t\tShowHint("Package delivered! Return to ${p.npcAName}.");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcAVendorId}, "You delivered it already? That was fast, [name]! Here's your reward.");

\trule\t\tTalkedToNpc(${p.npcAVendorId}) goto Reward
}

state Reward
{
\taction\t\tGiveEXP(${p.expReward});
\taction\t\tShowHint("[Quest Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tEnd();
}

state LostPackage
{
\taction\t\tShowHint("[Quest Failed] You lost the ${p.itemName}!");
\taction\t\tPlaySound(17);
\taction\t\tReset();
}

state Reset
{
\taction\t\tAddNpcText(${p.npcAVendorId}, "Maybe another time then!");
\taction\t\tReset();
}`;
}

function generateExploreQuest(p) {
  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcName}"

\taction\t\tShowHint("Quest reward: ${p.expReward} EXP!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Well met, [name]! I've heard rumors about ${p.targetMapName}.");
\taction\t\tAddNpcText(${p.npcVendorId}, "Would you explore the area and report back to me?");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "I'll check it out!");
\taction\t\tAddNpcInput(${p.npcVendorId}, 2, "That sounds dangerous...");

\trule\t\tInputNpc(1) goto Explore
\trule\t\tInputNpc(2) goto Reset
}

state Explore
{
\tdesc\t\t"Explore ${p.targetMapName}"

\taction\t\tShowHint("Travel to ${p.targetMapName} and explore the area!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcChat(${p.npcVendorId}, "Be careful out there, [name]!");

\trule\t\tEnterMap(${p.targetMapId}) goto Found
}

state Found
{
\tdesc\t\t"Return to ${p.npcName}"

\taction\t\tShowHint("You've explored ${p.targetMapName}! Return to ${p.npcName}.");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "You made it back in one piece! Tell me, what did you find?");
\taction\t\tAddNpcText(${p.npcVendorId}, "Fascinating... here is your reward for the expedition!");

\trule\t\tTalkedToNpc(${p.npcVendorId}) goto Reward
}

state Reward
{
\taction\t\tGiveEXP(${p.expReward});
\taction\t\tShowHint("[Quest Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tEnd();
}

state Reset
{
\taction\t\tAddNpcText(${p.npcVendorId}, "I understand. Perhaps another adventurer will go!");
\taction\t\tReset();
}`;
}

function generateBossQuest(p) {
  const itemRewardLines = p.itemRewardId > 0
    ? `\taction\t\tGiveItem(${p.itemRewardId});\n`
    : '';

  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcName}"

\taction\t\tShowHint("Quest reward: ${p.expReward} EXP!${p.itemRewardId > 0 ? ' + Special Item!' : ''}");
\taction\t\tAddNpcText(${p.npcVendorId}, "[name], I have an urgent task for you.");
\taction\t\tAddNpcText(${p.npcVendorId}, "The ${p.bossName} has become a serious threat. Someone must put an end to it!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Are you brave enough to face the ${p.bossName}?");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "I'll slay the ${p.bossName}!");
\taction\t\tAddNpcInput(${p.npcVendorId}, 2, "I'm not ready for that...");

\trule\t\tInputNpc(1) goto Hunt
\trule\t\tInputNpc(2) goto Reset
}

state Hunt
{
\tdesc\t\t"Slay the ${p.bossName}"

\taction\t\tShowHint("Find and defeat the ${p.bossName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcChat(${p.npcVendorId}, "May the gods watch over you, [name]!");
\taction\t\tAddNpcText(${p.npcVendorId}, "The ${p.bossName} still lives! Hurry, [name]!");

\trule\t\tKilledNpcs(${p.bossNpcId}, 1) goto Return
}

state Return
{
\tdesc\t\t"Return to ${p.npcName}"

\taction\t\tShowHint("The ${p.bossName} is defeated! Return to ${p.npcName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "You actually did it, [name]! The ${p.bossName} is no more!");
\taction\t\tAddNpcText(${p.npcVendorId}, "You are a true hero. Please accept this as a token of our gratitude!");

\trule\t\tTalkedToNpc(${p.npcVendorId}) goto Reward
}

state Reward
{
\taction\t\tGiveEXP(${p.expReward});
${itemRewardLines}\taction\t\tShowHint("[Quest Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tEnd();
}

state Reset
{
\taction\t\tAddNpcText(${p.npcVendorId}, "I understand. The ${p.bossName} is truly fearsome...");
\taction\t\tReset();
}`;
}

function generateDailyQuest(p) {
  return `Main
{
\tquestname \t"${p.questName}"
\tversion\t\t1
}

state Begin
{
\tdesc\t\t"Speak with ${p.npcName}"

\taction\t\tShowHint("Daily Quest reward: ${p.expReward} EXP!");
\taction\t\tAddNpcText(${p.npcVendorId}, "Good to see you, [name]! Ready for today's patrol?");
\taction\t\tAddNpcText(${p.npcVendorId}, "I need you to eliminate ${p.killCount} ${p.monsterName}s. Think you can handle it?");

\taction\t\tAddNpcInput(${p.npcVendorId}, 1, "Count me in!");
\taction\t\tAddNpcInput(${p.npcVendorId}, 2, "Not today.");

\trule\t\tInputNpc(1) goto Hunt
\trule\t\tInputNpc(2) goto Reset
\trule\t\tDoneDaily(1) goto Done
}

state Hunt
{
\tdesc\t\t"Kill ${p.killCount} ${p.monsterName}s"

\taction\t\tShowHint("Kill ${p.killCount} ${p.monsterName}s for ${p.npcName}!");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcChat(${p.npcVendorId}, "Keep at it, [name]!");

\trule\t\tKilledNpcs(${p.monsterNpcId}, ${p.killCount}) goto Return
}

state Return
{
\tdesc\t\t"Return to ${p.npcName}"

\taction\t\tShowHint("Patrol complete! Return to ${p.npcName}.");
\taction\t\tPlaySound(18);

\taction\t\tAddNpcText(${p.npcVendorId}, "Great job today, [name]! See you again tomorrow!");

\trule\t\tTalkedToNpc(${p.npcVendorId}) goto Reward
}

state Reward
{
\taction\t\tGiveEXP(${p.expReward});
\taction\t\tShowHint("[Daily Complete] You gained ${p.expReward} EXP!");
\taction\t\tPlaySound(97);
\taction\t\tResetDaily();
}

state Done
{
\taction\t\tAddNpcText(${p.npcVendorId}, "You've already completed today's patrol. Come back tomorrow, [name]!");

\trule\t\tDoneDaily(1) goto Done
}

state Reset
{
\taction\t\tAddNpcText(${p.npcVendorId}, "No problem, come back when you're ready!");
\taction\t\tReset();
}`;
}
