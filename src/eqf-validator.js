/**
 * EQF Validator - validates quest file structure against known actions/rules.
 */
import { ACTIONS, RULES } from './quest-data.js';

const actionMap = new Map(ACTIONS.map(a => [a.name.toLowerCase(), a]));
const ruleMap = new Map(RULES.map(r => [r.name.toLowerCase(), r]));

/**
 * Validate EQF content and return a list of issues.
 * @param {string} eqf - Raw EQF text content
 * @returns {{ errors: string[], warnings: string[], valid: boolean }}
 */
export function validateEqf(eqf) {
  const errors = [];
  const warnings = [];

  if (!eqf || !eqf.trim()) {
    errors.push('Empty quest file');
    return { errors, warnings, valid: false };
  }

  const lines = eqf.split('\n');
  let hasMain = false;
  let hasQuestname = false;
  let hasVersion = false;
  let hasBeginState = false;
  const stateNames = new Set();
  const gotoTargets = new Set();

  let inMain = false;
  let inState = false;
  let currentState = '';
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    // Track braces
    if (line.includes('{')) braceDepth++;
    if (line.includes('}')) {
      braceDepth--;
      if (braceDepth === 0) {
        inMain = false;
        inState = false;
      }
    }

    // Main block detection
    if (line.toLowerCase() === 'main') {
      hasMain = true;
      inMain = true;
      continue;
    }

    // Main block contents
    if (inMain) {
      if (line.toLowerCase().startsWith('questname')) hasQuestname = true;
      if (line.toLowerCase().startsWith('version')) hasVersion = true;
    }

    // State block detection
    const stateMatch = line.match(/^state\s+(\w+)\s*$/i);
    if (stateMatch) {
      currentState = stateMatch[1];
      stateNames.add(currentState.toLowerCase());
      if (currentState.toLowerCase() === 'begin') hasBeginState = true;
      inState = true;
      continue;
    }

    // Check actions in state blocks
    if (inState) {
      const actionMatch = line.match(/^(?:action\s+)?(\w+)\s*\(/i);
      if (actionMatch && line.startsWith('action')) {
        const funcName = actionMatch[1].toLowerCase();
        if (!actionMap.has(funcName)) {
          warnings.push(`Line ${lineNum}: Unknown action "${actionMatch[1]}"`);
        }

        // Check text length limits
        const stringArgs = [...line.matchAll(/"([^"]*)"/g)].map(m => m[1]);
        if (funcName === 'showhint' || funcName === 'addnpcchat') {
          for (const arg of stringArgs) {
            if (arg.length > 120) {
              warnings.push(`Line ${lineNum}: ${actionMatch[1]} text too long (${arg.length} chars, max ~120)`);
            }
          }
        } else if (funcName === 'addnpctext') {
          for (const arg of stringArgs) {
            if (arg.length > 150) {
              warnings.push(`Line ${lineNum}: AddNpcText too long (${arg.length} chars, max ~150) — split into multiple calls`);
            }
          }
        } else if (funcName === 'settitle') {
          for (const arg of stringArgs) {
            if (arg.length > 32) {
              warnings.push(`Line ${lineNum}: SetTitle too long (${arg.length} chars, max 32)`);
            }
          }
        }
      }

      // Check desc field length
      const descMatch = line.match(/^desc\s+"([^"]*)"/i);
      if (descMatch && descMatch[1].length > 150) {
        warnings.push(`Line ${lineNum}: State desc too long (${descMatch[1].length} chars, max ~150)`);
      }

      // Check rules
      const ruleMatch = line.match(/^rule\s+(\w+)\s*\(/i);
      if (ruleMatch) {
        const funcName = ruleMatch[1].toLowerCase();
        if (!ruleMap.has(funcName)) {
          warnings.push(`Line ${lineNum}: Unknown rule "${ruleMatch[1]}"`);
        }
      }

      // Track goto targets
      const gotoMatch = line.match(/goto\s+(\w+)/i);
      if (gotoMatch) {
        gotoTargets.add(gotoMatch[1].toLowerCase());
      }
    }
  }

  // Structural checks
  if (!hasMain) errors.push('Missing Main block');
  if (hasMain && !hasQuestname) errors.push('Main block missing "questname"');
  if (hasMain && !hasVersion) errors.push('Main block missing "version"');
  if (!hasBeginState) errors.push('Missing "state Begin" block');

  // Check goto targets
  for (const target of gotoTargets) {
    if (!stateNames.has(target)) {
      errors.push(`Goto target "${target}" does not match any state`);
    }
  }

  // Check for orphan states (unreachable)
  if (stateNames.size > 1) {
    const reachable = new Set(['begin']);
    for (const target of gotoTargets) {
      reachable.add(target);
    }
    for (const state of stateNames) {
      if (!reachable.has(state) && state !== 'begin') {
        warnings.push(`State "${state}" may be unreachable`);
      }
    }
  }

  // Check for End or Reset
  const hasEnd = eqf.toLowerCase().includes('end()');
  const hasReset = eqf.toLowerCase().includes('reset()');
  if (!hasEnd && !hasReset) {
    warnings.push('Quest has no End() or Reset() action — it may not terminate properly');
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0,
  };
}
