/**
 * quest-folder.js — Quest folder management
 * Allows users to open a quest folder, browse .eqf files, and save back via File System Access API.
 */
import { validateEqf } from './eqf-validator.js';

// ── State ────────────────────────────────────────────────────────

/** @type {FileSystemDirectoryHandle|null} */
let dirHandle = null;

/** @type {Map<string, {content: string, handle: FileSystemFileHandle|null}>} */
const questFiles = new Map();

// ── Feature Detection ────────────────────────────────────────────

/** Whether the File System Access API is available (Chromium browsers). */
export function supportsDirectoryPicker() {
  return typeof window.showDirectoryPicker === 'function';
}

/** Whether we have a live directory handle for save-back. */
export function hasDirectoryAccess() {
  return dirHandle !== null;
}

// ── Open Folder ──────────────────────────────────────────────────

/**
 * Open a quest folder using the File System Access API (Chromium)
 * or fall back to a hidden <input webkitdirectory> for other browsers.
 * @returns {Promise<{count: number, errors: string[]}>}
 */
export async function openQuestFolder() {
  if (supportsDirectoryPicker()) {
    return openWithDirectoryPicker();
  }
  return openWithFileInput();
}

async function openWithDirectoryPicker() {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err.name === 'AbortError') return { count: 0, errors: [] }; // user cancelled
    throw err;
  }

  questFiles.clear();
  const errors = [];

  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind !== 'file' || !name.toLowerCase().endsWith('.eqf')) continue;
    try {
      const file = await entry.getFile();
      const content = await file.text();
      questFiles.set(name, { content, handle: entry });
    } catch (e) {
      errors.push(`Failed to read ${name}: ${e.message}`);
    }
  }

  return { count: questFiles.size, errors };
}

/**
 * Fallback: prompt user via <input type="file" webkitdirectory>.
 * Returns a Promise resolved when user selects files.
 */
function openWithFileInput() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.accept = '.eqf';

    input.addEventListener('change', async () => {
      questFiles.clear();
      dirHandle = null; // no directory handle in fallback mode
      const errors = [];

      for (const file of input.files) {
        if (!file.name.toLowerCase().endsWith('.eqf')) continue;
        try {
          const content = await file.text();
          questFiles.set(file.name, { content, handle: null });
        } catch (e) {
          errors.push(`Failed to read ${file.name}: ${e.message}`);
        }
      }

      resolve({ count: questFiles.size, errors });
    });

    // If user cancels, the change event never fires — resolve with 0 after a brief delay
    input.addEventListener('cancel', () => resolve({ count: 0, errors: [] }));
    input.click();
  });
}

// ── Load from File List (drag-and-drop support) ──────────────────

/**
 * Load .eqf files from a FileList (e.g. from drag-and-drop).
 * Does NOT give directory access for save-back.
 * @param {FileList} fileList
 * @returns {Promise<{count: number, errors: string[]}>}
 */
export async function loadQuestFilesFromList(fileList) {
  questFiles.clear();
  dirHandle = null;
  const errors = [];

  for (const file of fileList) {
    if (!file.name.toLowerCase().endsWith('.eqf')) continue;
    try {
      const content = await file.text();
      questFiles.set(file.name, { content, handle: null });
    } catch (e) {
      errors.push(`Failed to read ${file.name}: ${e.message}`);
    }
  }

  return { count: questFiles.size, errors };
}

// ── Get Quest Data ───────────────────────────────────────────────

/**
 * Returns a summary list of all loaded quests with validation status.
 * @returns {Array<{filename: string, questName: string, valid: boolean, errorCount: number, warningCount: number}>}
 */
export function getQuestList() {
  const list = [];
  for (const [filename, { content }] of questFiles) {
    const nameMatch = content.match(/questname\s+"([^"]+)"/);
    const questName = nameMatch ? nameMatch[1] : filename.replace(/\.eqf$/i, '');

    const result = validateEqf(content);
    list.push({
      filename,
      questName,
      valid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });
  }

  // Sort alphabetically by quest name
  list.sort((a, b) => a.questName.localeCompare(b.questName));
  return list;
}

/**
 * Get the raw EQF content for a specific quest file.
 * @param {string} filename
 * @returns {string|null}
 */
export function getQuestContent(filename) {
  const entry = questFiles.get(filename);
  return entry ? entry.content : null;
}

/** @returns {number} Number of loaded quest files. */
export function getQuestCount() {
  return questFiles.size;
}

// ── Save Back ────────────────────────────────────────────────────

/**
 * Save quest content back to an existing file in the directory.
 * Falls back to download if no directory access.
 * @param {string} filename - Existing filename to overwrite
 * @param {string} content - New EQF content
 * @returns {Promise<{saved: boolean, method: 'directory'|'download'}>}
 */
export async function saveQuestToFolder(filename, content) {
  const entry = questFiles.get(filename);

  // Try File System Access API write-back
  if (entry?.handle) {
    try {
      const writable = await entry.handle.createWritable();
      await writable.write(content);
      await writable.close();
      // Update in-memory copy
      entry.content = content;
      return { saved: true, method: 'directory' };
    } catch (e) {
      console.warn('Directory write failed, falling back to download:', e);
    }
  }

  // Fallback: trigger browser download
  downloadFile(filename, content);
  // Update in-memory copy if we have one
  if (entry) entry.content = content;
  return { saved: true, method: 'download' };
}

/**
 * Save a new quest to the opened directory (or download as fallback).
 * Derives filename from the questname in the EQF content.
 * @param {string} content - EQF content to save
 * @returns {Promise<{saved: boolean, filename: string, method: 'directory'|'download'}>}
 */
export async function saveNewQuestToFolder(content) {
  const nameMatch = content.match(/questname\s+"([^"]+)"/);
  const baseName = nameMatch
    ? nameMatch[1].replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').toLowerCase()
    : 'quest';
  const filename = `${baseName}.eqf`;

  // Try File System Access API
  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      // Add to our in-memory map
      questFiles.set(filename, { content, handle: fileHandle });
      return { saved: true, filename, method: 'directory' };
    } catch (e) {
      console.warn('Directory write failed, falling back to download:', e);
    }
  }

  // Fallback: trigger browser download
  downloadFile(filename, content);
  questFiles.set(filename, { content, handle: null });
  return { saved: true, filename, method: 'download' };
}

/**
 * Update the in-memory content for a quest (e.g. after AI edits) without writing to disk.
 * @param {string} filename
 * @param {string} content
 */
export function updateQuestContent(filename, content) {
  const entry = questFiles.get(filename);
  if (entry) {
    entry.content = content;
  }
}

/**
 * Clear all loaded quest data and directory handle.
 */
export function clearQuestFolder() {
  questFiles.clear();
  dirHandle = null;
}

// ── Helpers ──────────────────────────────────────────────────────

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
