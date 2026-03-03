/**
 * Google Gemini AI integration for quest generation.
 * Uses @google/genai SDK to generate EQF quest files from natural language prompts.
 */
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from './quest-data.js';
import { buildReferenceString, resolveEntities } from './reference-data.js';

const STORAGE_KEY = 'quest-gen-api-key';
const MODEL_KEY = 'quest-gen-model';
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Get the stored API key from localStorage.
 */
export function getApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

/**
 * Save the API key to localStorage.
 */
export function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Get the selected model.
 */
export function getModel() {
  return localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
}

/**
 * Set the model.
 */
export function setModel(model) {
  localStorage.setItem(MODEL_KEY, model);
}

/**
 * Check if the API key is configured.
 */
export function isConfigured() {
  return !!getApiKey();
}

/**
 * Test the API connection.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testConnection() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, message: 'No API key configured' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: 'Reply with just the word "connected"',
    });
    return { success: true, message: `Connected! Model: ${getModel()}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Generate a quest from a natural language prompt.
 * @param {string} prompt - The user's quest description
 * @param {function} onStatus - Status callback for UI updates
 * @returns {Promise<string>} The generated EQF content
 */
export async function generateQuest(prompt, onStatus) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Please set your Google AI API key in settings.');
  }

  onStatus?.('Building quest context...');

  const referenceData = buildReferenceString();
  const systemPrompt = buildSystemPrompt(referenceData);

  // Pre-resolve entity names from the user prompt against loaded game data
  const resolvedMatches = resolveEntities(prompt);

  onStatus?.('Generating quest with Gemini AI...');

  // Inject pre-resolved entities into the prompt so the AI uses exact IDs
  let enrichedPrompt = prompt;
  if (resolvedMatches) {
    enrichedPrompt = `${prompt}\n\n${resolvedMatches}\n\nIMPORTANT: Use the pre-resolved entity IDs listed above. These are the closest matches from the game data for the names I mentioned.`;
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: getModel(),
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.8,
    },
    contents: enrichedPrompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Strip any markdown code fences the model might have added
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }

  return cleaned;
}

/**
 * Regenerate a specific part of a quest.
 * @param {string} currentEqf - The current EQF content
 * @param {string} instruction - What to change
 * @returns {Promise<string>} Updated EQF content
 */
export async function refineQuest(currentEqf, instruction) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured.');
  }

  const referenceData = buildReferenceString();
  const systemPrompt = buildSystemPrompt(referenceData);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: getModel(),
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    },
    contents: `Here is an existing quest file:\n\n${currentEqf}\n\nPlease modify it according to this instruction: ${instruction}\n\nOutput ONLY the complete modified .eqf file content.`,
  });

  let cleaned = response.text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }

  return cleaned;
}

/**
 * Audit a generated quest using the local validator, then AI-fix if needed.
 * Uses validateFn (local deterministic validator) as the source of truth.
 * Retries up to MAX_AUDIT_RETRIES if the AI fix still has errors.
 *
 * @param {string} eqfContent - The generated EQF content to audit
 * @param {function} validateFn - Local validator function (eqf => {errors, warnings, valid})
 * @param {function} [onStatus] - Optional status callback for UI updates
 * @returns {Promise<{eqf: string, wasFixed: boolean, issues: string[]}>}
 */
const MAX_AUDIT_RETRIES = 2;

export async function auditQuest(eqfContent, validateFn, onStatus) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { eqf: eqfContent, wasFixed: false, issues: [] };
  }

  // Step 1: Run local validator first — it's the source of truth
  const initialResult = validateFn(eqfContent);
  if (initialResult.valid && initialResult.warnings.length === 0) {
    // Quest is already clean — no need for AI audit
    return { eqf: eqfContent, wasFixed: false, issues: [] };
  }

  // Collect all issues found by local validator
  const localIssues = [...initialResult.errors, ...initialResult.warnings];

  // Step 2: Send to AI for fixing, with the specific errors to address
  let currentEqf = eqfContent;
  let allIssuesFixed = [];
  let wasFixed = false;

  for (let attempt = 0; attempt < MAX_AUDIT_RETRIES; attempt++) {
    const currentValidation = attempt === 0 ? initialResult : validateFn(currentEqf);
    const currentIssues = [...currentValidation.errors, ...currentValidation.warnings];

    if (currentValidation.valid && currentValidation.warnings.length === 0) {
      break; // All clean
    }

    onStatus?.(`Fixing quest issues (attempt ${attempt + 1}/${MAX_AUDIT_RETRIES})...`);

    const referenceData = buildReferenceString();
    const fixedEqf = await requestAiFix(currentEqf, currentIssues, referenceData);

    if (fixedEqf && fixedEqf !== currentEqf) {
      currentEqf = fixedEqf;
      wasFixed = true;
      allIssuesFixed.push(...currentIssues);
    } else {
      // AI couldn't fix it or returned the same thing — stop retrying
      break;
    }
  }

  // Final validation check
  const finalResult = validateFn(currentEqf);
  const remainingIssues = [...finalResult.errors, ...finalResult.warnings];

  return {
    eqf: currentEqf,
    wasFixed,
    issues: wasFixed ? allIssuesFixed : localIssues,
    remainingIssues,
    finalValid: finalResult.valid,
  };
}

/**
 * Send EQF to the AI with specific errors to fix.
 * @returns {Promise<string|null>} Fixed EQF or null if it couldn't fix
 */
async function requestAiFix(eqfContent, issues, referenceData) {
  const apiKey = getApiKey();
  const issueList = issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

  const fixPrompt = `You are an EQF quest file fixer. The following quest file has been validated and has these specific errors that MUST be fixed:

## ERRORS TO FIX:
${issueList}

## HOW TO FIX COMMON ISSUES:
- "Goto target X does not match any state": Add the missing state block, or fix the goto to point to an existing state name (check spelling/case)
- "State X may be unreachable": Make sure some rule in another state has a "goto ${'{'}stateName${'}'}" pointing to it, or remove it if it's truly unnecessary
- "Missing Main block / questname / version": Add the Main block with questname and version
- "Missing state Begin block": Rename the first state to Begin, or add a Begin state
- "Unknown action/rule": Fix the typo or replace with a valid action/rule name
- "Quest has no End() or Reset()": Add a terminal state with End() or Reset()

## REFERENCE DATA:
${referenceData}

## QUEST FILE TO FIX:
${eqfContent}

IMPORTANT: Output ONLY the complete, corrected .eqf file content. No markdown fences, no explanation, no headers — just the raw fixed quest file.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: getModel(),
      config: {
        temperature: 0.1, // Very low temperature for precise fixes
      },
      contents: fixPrompt,
    });

    let fixed = response.text?.trim();
    if (!fixed) return null;

    // Strip any markdown code fences
    if (fixed.startsWith('```')) {
      fixed = fixed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }

    // Basic sanity check — must still look like an EQF file
    if (!fixed.includes('Main') || !fixed.includes('state')) {
      return null;
    }

    return fixed;
  } catch {
    return null;
  }
}
