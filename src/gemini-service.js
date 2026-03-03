/**
 * Google Gemini AI integration for quest generation.
 * Uses @google/genai SDK to generate EQF quest files from natural language prompts.
 */
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from './quest-data.js';
import { buildReferenceString } from './reference-data.js';

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

  onStatus?.('Generating quest with Gemini AI...');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: getModel(),
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.8,
    },
    contents: prompt,
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
 * Audit a generated quest by sending it back to the AI for validation.
 * If issues are found, the AI returns a corrected version.
 * @param {string} eqfContent - The generated EQF content to audit
 * @returns {Promise<{eqf: string, wasFixed: boolean, issues: string[]}>}
 */
export async function auditQuest(eqfContent) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { eqf: eqfContent, wasFixed: false, issues: [] };
  }

  const referenceData = buildReferenceString();

  const auditPrompt = `You are an EQF quest file validator. Analyze the following quest file for errors and fix any issues you find.

## CHECKS TO PERFORM:
1. Every "goto StateName" target must exist as a defined "state StateName" block
2. Every AddNpcInput link_id must have a matching InputNpc(link_id) rule in the SAME state
3. Every state must be reachable (referenced by at least one goto, or is "Begin")
4. The quest must terminate properly — at least one path leads to End() or Reset()
5. All vendor_id values in AddNpcText/AddNpcInput/AddNpcChat must be consistent within each NPC
6. No duplicate state names
7. State names must be valid identifiers (no spaces, PascalCase preferred)
8. Actions must use correct argument types (strings in quotes, numbers without)
9. Every state transition must be logically sound (no impossible progression)
10. The Main block must have questname and version

## REFERENCE DATA:
${referenceData}

## QUEST FILE TO AUDIT:
${eqfContent}

## RESPONSE FORMAT:
Respond with EXACTLY this format (no markdown fences):

AUDIT_STATUS: PASS or FIXED
ISSUES: comma-separated list of issues found (or "none")
---EQF---
<the complete quest file, corrected if needed, or unchanged if valid>`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: getModel(),
    config: {
      temperature: 0.2, // Low temperature for precise validation
    },
    contents: auditPrompt,
  });

  const text = response.text?.trim();
  if (!text) {
    return { eqf: eqfContent, wasFixed: false, issues: [] };
  }

  // Parse the audit response
  const eqfSplit = text.split('---EQF---');
  if (eqfSplit.length < 2) {
    // Couldn't parse response format — return original
    return { eqf: eqfContent, wasFixed: false, issues: [] };
  }

  const header = eqfSplit[0].trim();
  let fixedEqf = eqfSplit[1].trim();

  // Strip any markdown code fences
  if (fixedEqf.startsWith('```')) {
    fixedEqf = fixedEqf.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }

  const wasFixed = header.includes('FIXED');
  const issuesMatch = header.match(/ISSUES:\s*(.+)/i);
  const issues = issuesMatch && issuesMatch[1].trim().toLowerCase() !== 'none'
    ? issuesMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    eqf: fixedEqf || eqfContent,
    wasFixed,
    issues,
  };
}
