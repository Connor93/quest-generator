/**
 * EQF Validator - validates quest file structure against known actions/rules.
 * Matches the EOPlus parser syntax rules from the server (parse.cpp).
 */
import { ACTIONS, RULES } from './quest-data.js';

const actionMap = new Map(ACTIONS.map(a => [a.name.toLowerCase(), a]));
const ruleMap = new Map(RULES.map(r => [r.name.toLowerCase(), r]));

// Valid keywords inside state blocks (from ParseRuleActionBlock in parse.cpp)
const STATE_KEYWORDS = new Set(['action', 'rule', 'desc', 'goal', 'if', 'elseif', 'elif', 'else']);
// Valid keywords inside main block (from ParseMain in parse.cpp)
const MAIN_KEYWORDS = new Set(['questname', 'version', 'hidden', 'hidden_end', 'disabled']);

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
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNum = i + 1;

    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    // Strip trailing semicolons and comments for analysis
    const cleanLine = line.replace(/;?\s*(\/\/.*)?$/, '').trim();

    // Track braces
    if (line.includes('{')) braceDepth++;
    if (line.includes('}')) {
      braceDepth--;
      if (braceDepth === 0) {
        inMain = false;
        inState = false;
      }
      continue;
    }

    // Only a brace on this line
    if (line === '{' || line === '}') continue;

    // Main block detection
    if (line.toLowerCase() === 'main') {
      hasMain = true;
      inMain = true;
      continue;
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

    // ─── Main block validation ───
    if (inMain) {
      if (line.toLowerCase().startsWith('questname')) hasQuestname = true;
      else if (line.toLowerCase().startsWith('version')) hasVersion = true;
      else if (line === '{' || line === '}') { /* braces */ }
      else {
        const keyword = cleanLine.split(/\s+/)[0]?.toLowerCase();
        if (keyword && !MAIN_KEYWORDS.has(keyword)) {
          errors.push(`Line ${lineNum}: Invalid keyword "${keyword}" in Main block. Valid: questname, version, hidden, hidden_end, disabled`);
        }
      }
      continue;
    }

    // ─── State block validation ───
    if (inState) {
      const firstWord = cleanLine.split(/\s+/)[0]?.toLowerCase();

      // Check for goto(StateName) — goto should NOT use parentheses
      if (/goto\s*\(/i.test(cleanLine)) {
        errors.push(`Line ${lineNum}: "goto" is not a function — use "goto StateName" not "goto(StateName)"`);
      }

      // ── desc line ──
      if (firstWord === 'desc') {
        const descMatch = cleanLine.match(/^desc\s+"([^"]*)"/i);
        if (descMatch) {
          if (descMatch[1].length > 32) {
            warnings.push(`Line ${lineNum}: State desc too long (${descMatch[1].length} chars, max 32)`);
          }
        } else if (!cleanLine.match(/^desc\s+"/i)) {
          errors.push(`Line ${lineNum}: desc value must be a quoted string — e.g. desc "My quest description"`);
        }
        continue;
      }

      // ── goal line ── (treated like a rule)
      if (firstWord === 'goal') {
        continue;
      }

      // ── if/elseif/elif/else ──
      if (firstWord === 'if' || firstWord === 'elseif' || firstWord === 'elif' || firstWord === 'else') {
        // These are conditional action wrappers, apply similar function checks
        const funcMatch = cleanLine.match(/(?:if|elseif|elif|else)\s+(\w+)\s*\(/i);
        if (funcMatch) {
          const funcName = funcMatch[1].toLowerCase();
          if (funcName !== 'goto' && !ruleMap.has(funcName) && !actionMap.has(funcName)) {
            warnings.push(`Line ${lineNum}: Unknown function "${funcMatch[1]}" in conditional`);
          }
          // Check for space before paren
          if (/\w\s+\(/.test(cleanLine.match(/(?:if|elseif|elif|else)\s+(.+)/i)?.[1] || '')) {
            const spaceCheck = cleanLine.match(/(\w+)\s+\(/);
            if (spaceCheck && spaceCheck[1].toLowerCase() !== 'goto') {
              warnings.push(`Line ${lineNum}: Space before "(" in "${spaceCheck[1]} (" — should be "${spaceCheck[1]}("`);
            }
          }
        }
        continue;
      }

      // ── action line ──
      if (firstWord === 'action') {
        const afterAction = cleanLine.replace(/^action\s+/i, '');
        const funcMatch = afterAction.match(/^(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1].toLowerCase();

          // Check for unknown action
          if (!actionMap.has(funcName)) {
            errors.push(`Line ${lineNum}: Unknown action "${funcMatch[1]}" — check spelling or see available actions list`);
          }

          // Check for space before (
          if (/^\w+\s+\(/.test(afterAction)) {
            warnings.push(`Line ${lineNum}: Space before "(" in "${funcMatch[1]} (" — should be "${funcMatch[1]}("`);
          }

          // Validate argument types for known actions
          if (actionMap.has(funcName)) {
            validateFunctionArgs(cleanLine, funcName, actionMap.get(funcName), lineNum, errors, warnings);
          }

          // Check text length limits
          const stringArgs = [...cleanLine.matchAll(/"([^"]*)"/g)].map(m => m[1]);
          if (funcName === 'showhint' || funcName === 'addnpcchat') {
            for (const arg of stringArgs) {
              if (arg.length > 120) {
                warnings.push(`Line ${lineNum}: ${funcMatch[1]} text too long (${arg.length} chars, max ~120)`);
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
        } else {
          // action keyword but no valid function call after it
          errors.push(`Line ${lineNum}: "action" must be followed by a function call — e.g. action ShowHint("text")`);
        }

        // Also track any goto in action lines (e.g. action SetState(...))
        const gotoMatch = cleanLine.match(/goto\s+(\w+)/i);
        if (gotoMatch) {
          gotoTargets.add(gotoMatch[1].toLowerCase());
        }
        continue;
      }

      // ── rule line ──
      if (firstWord === 'rule') {
        const afterRule = cleanLine.replace(/^rule\s+/i, '');
        const funcMatch = afterRule.match(/^(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1].toLowerCase();

          // Check for unknown rule
          if (!ruleMap.has(funcName)) {
            errors.push(`Line ${lineNum}: Unknown rule "${funcMatch[1]}" — check spelling or see available rules list`);
          }

          // Check for space before (
          if (/^\w+\s+\(/.test(afterRule)) {
            warnings.push(`Line ${lineNum}: Space before "(" in "${funcMatch[1]} (" — should be "${funcMatch[1]}("`);
          }

          // Validate argument types for known rules
          if (ruleMap.has(funcName)) {
            validateFunctionArgs(cleanLine, funcName, ruleMap.get(funcName), lineNum, errors, warnings);
          }
        } else {
          errors.push(`Line ${lineNum}: "rule" must be followed by a function call — e.g. rule GotItems(12, 20) goto NextState`);
        }

        // Track goto target
        const gotoMatch = cleanLine.match(/goto\s+(\w+)/i);
        if (gotoMatch) {
          gotoTargets.add(gotoMatch[1].toLowerCase());
        } else {
          // Rules should have a goto or action after them
          errors.push(`Line ${lineNum}: Rule is missing "goto StateName" — every rule needs a transition`);
        }
        continue;
      }

      // ── Line doesn't start with a valid keyword ──
      // This is likely a bare function call missing 'action' or 'rule'
      if (firstWord && !STATE_KEYWORDS.has(firstWord) && firstWord !== '}') {
        // Check if it looks like a function call (might be missing 'action' keyword)
        if (/^\w+\s*\(/.test(cleanLine)) {
          const funcMatch = cleanLine.match(/^(\w+)\s*\(/);
          const funcName = funcMatch[1].toLowerCase();
          if (actionMap.has(funcName)) {
            errors.push(`Line ${lineNum}: Missing "action" keyword — write "action ${funcMatch[1]}(...)" not "${funcMatch[1]}(...)"`);
          } else if (ruleMap.has(funcName)) {
            errors.push(`Line ${lineNum}: Missing "rule" keyword — write "rule ${funcMatch[1]}(...) goto StateName" not "${funcMatch[1]}(...)"`);
          } else {
            errors.push(`Line ${lineNum}: Invalid line in state "${currentState}" — lines must start with: action, rule, desc, goal, if, elseif, or else`);
          }
        } else if (/goto/i.test(cleanLine)) {
          errors.push(`Line ${lineNum}: Bare "goto" without a rule — should be "rule SomeCondition() goto ${cleanLine.match(/goto\s+(\w+)/i)?.[1] || 'StateName'}"`);
        } else {
          errors.push(`Line ${lineNum}: Invalid keyword "${firstWord}" in state "${currentState}" — lines must start with: action, rule, desc, goal, if, elseif, or else`);
        }
      }
    }
  }

  // ─── Structural checks ───
  if (!hasMain) errors.push('Missing Main block');
  if (hasMain && !hasQuestname) errors.push('Main block missing "questname"');
  if (hasMain && !hasVersion) errors.push('Main block missing "version"');
  if (!hasBeginState) errors.push('Missing "state Begin" block');

  // Check goto targets exist
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

/**
 * Validate function arguments against the expected types.
 */
function validateFunctionArgs(line, funcName, funcDef, lineNum, errors, warnings) {
  // Extract the args portion from the function call
  const argsMatch = line.match(new RegExp(funcName + '\\s*\\((.*)\\)', 'i'));
  if (!argsMatch) return;

  const argsStr = argsMatch[1].trim();
  if (!argsStr) return; // Empty args like End()

  // Simple arg parser: split on commas outside of quotes
  const args = [];
  let current = '';
  let inQuote = false;
  for (const ch of argsStr) {
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === ',' && !inQuote) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());

  const expectedArgs = funcDef.args;

  for (let j = 0; j < args.length && j < expectedArgs.length; j++) {
    const arg = args[j];
    const expected = expectedArgs[j];

    if (expected.type === 'int') {
      // Numeric args should NOT be quoted
      if (arg.startsWith('"') && arg.endsWith('"')) {
        warnings.push(`Line ${lineNum}: Argument "${expected.name}" of ${funcDef.name}() should be a number, not a string`);
      } else if (!/^-?\d+$/.test(arg)) {
        warnings.push(`Line ${lineNum}: Argument "${expected.name}" of ${funcDef.name}() should be a number, got "${arg}"`);
      }
    } else if (expected.type === 'string') {
      // String args should be quoted
      if (!arg.startsWith('"') || !arg.endsWith('"')) {
        errors.push(`Line ${lineNum}: Argument "${expected.name}" of ${funcDef.name}() should be a quoted string — got: ${arg}`);
      }
    }
  }
}
