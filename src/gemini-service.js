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
