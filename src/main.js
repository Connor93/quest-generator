/**
 * Quest Generator — Main Application Entry Point
 * Wires together all modules: AI generation, templates, preview, validation, reference, pub file loading.
 */
import './style.css';
import { ACTIONS, RULES } from './quest-data.js';
import { getNpcs, getItems, getClasses, getSpells, SOUNDS, searchAll, setGameData, resetToDefaults, isCustomDataLoaded } from './reference-data.js';
import { TEMPLATES, generateFromTemplate } from './quest-builder.js';
import { generateQuest, refineQuest, auditQuest, getApiKey, setApiKey, getModel, setModel, isConfigured, testConnection } from './gemini-service.js';
import { highlightEqf } from './eqf-generator.js';
import { validateEqf } from './eqf-validator.js';
import { loadDataFiles, saveToStorage, loadFromStorage, clearStorage, getDataSummary } from './pub-loader.js';
import {
  openQuestFolder, getQuestList, getQuestContent, getQuestCount,
  saveQuestToFolder, saveNewQuestToFolder, hasDirectoryAccess, updateQuestContent,
  restoreSavedFolder,
} from './quest-folder.js';

// ===== STATE =====
let currentEqf = '';
let selectedTemplate = null;
let isDirty = false;
let loadedFromFile = null; // filename if loaded from quest folder, null otherwise
let isEditing = false;
let editDebounceTimer = null;

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initPubData();
  initTemplateGrid();
  initReferencePanel();
  initSettings();
  initDataUpload();
  initQuestFolder();
  initEventListeners();
});

// ===== PUB DATA INIT (from storage) =====
function initPubData() {
  const stored = loadFromStorage();
  if (stored) {
    setGameData(stored);
    updateDataUI();
  }
}

function updateDataUI() {
  const indicator = $('#ref-data-indicator');
  const statusEl = $('#data-status');
  const clearBtn = $('#btn-clear-data');

  if (isCustomDataLoaded()) {
    const npcs = getNpcs();
    const items = getItems();
    const spells = getSpells();
    const classes = getClasses();
    const summary = getDataSummary({ items, npcs, spells, classes });

    indicator.textContent = `✅ Custom data: ${summary}`;
    indicator.className = 'ref-data-indicator custom';

    statusEl.textContent = `✅ ${summary}`;
    statusEl.className = 'data-status loaded';
    clearBtn.classList.remove('hidden');
  } else {
    indicator.textContent = '📦 Default curated data';
    indicator.className = 'ref-data-indicator';
    statusEl.textContent = '';
    statusEl.className = 'data-status';
    clearBtn.classList.add('hidden');
  }
}

// ===== DATA UPLOAD =====
function initDataUpload() {
  const fileInput = $('#pub-file-input');
  const uploadArea = $('#data-upload-area');
  const clearBtn = $('#btn-clear-data');

  // File input change
  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handlePubFileUpload(e.target.files);
      fileInput.value = ''; // reset so same files can be re-uploaded
    }
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      await handlePubFileUpload(e.dataTransfer.files);
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    clearStorage();
    resetToDefaults();
    updateDataUI();
    refreshReferencePanel();
    showToast('Game data cleared — using defaults');
  });
}

async function handlePubFileUpload(files) {
  const statusEl = $('#data-status');
  statusEl.textContent = '⏳ Parsing pub files...';
  statusEl.className = 'data-status loading';

  try {
    const { db, errors } = await loadDataFiles(files);

    // Merge with existing data (allow incremental uploads)
    const existing = loadFromStorage() || {};
    const merged = {
      items: db.items || existing.items || null,
      npcs: db.npcs || existing.npcs || null,
      spells: db.spells || existing.spells || null,
      classes: db.classes || existing.classes || null,
    };

    setGameData(merged);
    saveToStorage(merged);
    updateDataUI();
    refreshReferencePanel();

    if (errors.length > 0) {
      showToast(`⚠️ ${errors.join(', ')}`);
    } else {
      const summary = getDataSummary(merged);
      showToast(`✅ Loaded: ${summary}`);
    }
  } catch (err) {
    statusEl.textContent = `❌ ${err.message}`;
    statusEl.className = 'data-status error';
  }
}

function refreshReferencePanel() {
  const activeTab = $('.tab-btn.active')?.dataset.tab || 'npcs';
  renderReferenceTab(activeTab);
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Generate buttons
  $('#btn-generate-ai').addEventListener('click', handleGenerateAI);
  $('#btn-generate-template').addEventListener('click', toggleTemplateSection);

  // Preview actions
  $('#btn-copy').addEventListener('click', handleCopy);
  $('#btn-download').addEventListener('click', handleDownload);
  $('#btn-auto-fix').addEventListener('click', handleAutoFix);
  $('#btn-fix-ai').addEventListener('click', handleFixWithAI);
  $('#btn-edit').addEventListener('click', toggleEdit);

  // Editor textarea — sync changes back to state with debounced validation
  $('#eqf-editor').addEventListener('input', () => {
    currentEqf = $('#eqf-editor').value;
    isDirty = true;
    clearTimeout(editDebounceTimer);
    editDebounceTimer = setTimeout(() => {
      updateValidation();
    }, 400);
  });

  // Reference panel
  $('#btn-reference').addEventListener('click', () => togglePanel('reference-panel'));
  $('#btn-close-reference').addEventListener('click', () => closePanel('reference-panel'));
  $('#reference-search').addEventListener('input', handleReferenceSearch);

  // Reference tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderReferenceTab(btn.dataset.tab);
    });
  });

  // Settings panel
  $('#btn-settings').addEventListener('click', () => togglePanel('settings-panel'));
  $('#btn-close-settings').addEventListener('click', () => closePanel('settings-panel'));
  $('#btn-save-key').addEventListener('click', handleSaveKey);
  $('#btn-test-connection').addEventListener('click', handleTestConnection);
  $('#btn-toggle-key').addEventListener('click', () => {
    const input = $('#api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  $('#model-select').addEventListener('change', (e) => setModel(e.target.value));

  // Overlay
  $('#overlay').addEventListener('click', closeAllPanels);

  // Refine
  $('#btn-refine').addEventListener('click', handleRefine);
  $('#refine-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRefine();
  });

  // Template actions
  $('#btn-build-template').addEventListener('click', handleBuildTemplate);
  $('#btn-cancel-template').addEventListener('click', () => {
    $('#template-section').classList.add('hidden');
    selectedTemplate = null;
  });

  // Quest folder panel
  $('#btn-quests').addEventListener('click', () => togglePanel('quest-folder-panel'));
  $('#btn-close-quests').addEventListener('click', () => closePanel('quest-folder-panel'));
  $('#btn-open-folder').addEventListener('click', handleOpenFolder);
  $('#btn-save-folder').addEventListener('click', handleSaveToFolder);
  $('#quest-folder-search').addEventListener('input', renderQuestList);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPanels();
  });
}

// ===== AI GENERATION =====
async function handleGenerateAI() {
  const prompt = $('#quest-prompt').value.trim();
  if (!prompt) {
    showStatus('Please describe the quest you want to create.', 'error');
    return;
  }

  if (!isConfigured()) {
    showStatus('No API key configured. Click ⚙️ Settings to add your Google AI key.', 'error');
    return;
  }

  const btn = $('#btn-generate-ai');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating...';

  try {
    const eqf = await generateQuest(prompt, (status) => {
      showStatus(status, 'info');
    });

    currentEqf = eqf;
    isDirty = true;
    loadedFromFile = null;
    updatePreview();

    // Auto-audit the generated quest
    showStatus('Auditing quest...', 'info');
    btn.innerHTML = '<span class="spinner"></span> Auditing...';
    try {
      const audit = await auditQuest(eqf, validateEqf, (status) => {
        showStatus(status, 'info');
      });
      currentEqf = audit.eqf;
      isDirty = true;
      updatePreview();
      if (audit.wasFixed && audit.finalValid) {
        showStatus(`Quest auto-fixed during audit 🔧 (fixed: ${audit.issues.join('; ')})`, 'success');
      } else if (audit.wasFixed && !audit.finalValid) {
        showStatus(`Quest partially fixed — ${audit.remainingIssues.length} issue(s) remain`, 'success');
      } else if (!audit.wasFixed && audit.issues.length > 0) {
        showStatus('Quest generated (some warnings detected)', 'success');
      } else {
        showStatus('Quest generated and passed audit ✅', 'success');
      }
    } catch (auditErr) {
      // Audit failed but we still have the original quest
      showStatus('Quest generated (audit skipped: ' + auditErr.message + ')', 'success');
    }

    $('#refine-section').classList.remove('hidden');
  } catch (err) {
    showStatus(`Generation failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> Generate with AI';
  }
}

// ===== REFINE =====
async function handleRefine() {
  const instruction = $('#refine-input').value.trim();
  if (!instruction || !currentEqf) return;

  if (!isConfigured()) {
    showStatus('No API key configured.', 'error');
    return;
  }

  const btn = $('#btn-refine');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const refined = await refineQuest(currentEqf, instruction);
    currentEqf = refined;
    isDirty = true;
    updatePreview();

    // Auto-audit the refined quest
    showStatus('Auditing refined quest...', 'info');
    try {
      const audit = await auditQuest(refined, validateEqf, (status) => {
        showStatus(status, 'info');
      });
      currentEqf = audit.eqf;
      isDirty = true;
      updatePreview();
      if (audit.wasFixed && audit.finalValid) {
        showStatus(`Quest refined and auto-fixed 🔧 (fixed: ${audit.issues.join('; ')})`, 'success');
      } else if (audit.wasFixed && !audit.finalValid) {
        showStatus(`Quest refined, partially fixed — ${audit.remainingIssues.length} issue(s) remain`, 'success');
      } else {
        showStatus('Quest refined and passed audit ✅', 'success');
      }
    } catch (auditErr) {
      showStatus('Quest refined (audit skipped: ' + auditErr.message + ')', 'success');
    }

    $('#refine-input').value = '';
  } catch (err) {
    showStatus(`Refine failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔄</span> Refine';
  }
}

// ===== TEMPLATES =====
function initTemplateGrid() {
  const grid = $('#template-grid');
  grid.innerHTML = TEMPLATES.map(t => `
    <div class="template-card" data-id="${t.id}">
      <div class="template-card-icon">${t.icon}</div>
      <div class="template-card-name">${t.name}</div>
      <div class="template-card-desc">${t.desc}</div>
    </div>
  `).join('');

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.template-card');
    if (!card) return;

    $$('.template-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    selectedTemplate = TEMPLATES.find(t => t.id === card.dataset.id);
    renderTemplateParams(selectedTemplate);
  });
}

function toggleTemplateSection() {
  const section = $('#template-section');
  section.classList.toggle('hidden');
}

function renderTemplateParams(template) {
  const container = $('#template-params');
  container.classList.remove('hidden');
  $('#template-actions').classList.remove('hidden');

  container.innerHTML = template.params.map(p => `
    <div class="param-group">
      <label class="param-label">${p.label}</label>
      <input
        class="param-input"
        type="${p.type}"
        data-key="${p.key}"
        value="${p.default || ''}"
        placeholder="${p.label}"
      />
    </div>
  `).join('');
}

function handleBuildTemplate() {
  if (!selectedTemplate) return;

  const params = {};
  $$('#template-params .param-input').forEach(input => {
    const val = input.type === 'number' ? Number(input.value) : input.value;
    params[input.dataset.key] = val;
  });

  try {
    currentEqf = generateFromTemplate(selectedTemplate.id, params);
    isDirty = true;
    loadedFromFile = null;
    updatePreview();
    showStatus(`Quest built from "${selectedTemplate.name}" template!`, 'success');
    $('#refine-section').classList.remove('hidden');
    $('#template-section').classList.add('hidden');
  } catch (err) {
    showStatus(`Template error: ${err.message}`, 'error');
  }
}

// ===== PREVIEW =====
function updatePreview() {
  // If user is in edit mode, just update validation — don't overwrite the textarea
  if (isEditing) {
    $('#eqf-editor').value = currentEqf;
    updateValidation();
    return;
  }

  const codeEl = $('#eqf-code');
  codeEl.innerHTML = highlightEqf(currentEqf);
  updateValidation();
}

/** Update validation badge + details without touching the preview content. */
function updateValidation() {
  // Validate
  const result = validateEqf(currentEqf);
  const badge = $('#validation-badge');
  const details = $('#validation-details');

  badge.classList.remove('hidden');

  // Show/hide the fix buttons
  const autoFixBtn = $('#btn-auto-fix');
  const aiFixBtn = $('#btn-fix-ai');

  if (result.valid && result.warnings.length === 0) {
    badge.className = 'validation-badge valid';
    badge.innerHTML = '<span class="badge-icon">✅</span><span class="badge-text">Valid</span>';
    details.classList.add('hidden');
    autoFixBtn.classList.add('hidden');
    aiFixBtn.classList.add('hidden');
  } else if (result.valid) {
    badge.className = 'validation-badge warnings';
    badge.innerHTML = `<span class="badge-icon">⚠️</span><span class="badge-text">${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}</span>`;
    details.classList.remove('hidden');
    details.innerHTML = result.warnings.map(w => `<div class="validation-warning">${w}</div>`).join('');
    autoFixBtn.classList.remove('hidden');
    aiFixBtn.classList.remove('hidden');
  } else {
    badge.className = 'validation-badge invalid';
    badge.innerHTML = `<span class="badge-icon">❌</span><span class="badge-text">${result.errors.length} error${result.errors.length > 1 ? 's' : ''}</span>`;
    details.classList.remove('hidden');
    details.innerHTML =
      result.errors.map(e => `<div class="validation-error">${e}</div>`).join('') +
      result.warnings.map(w => `<div class="validation-warning">${w}</div>`).join('');
    autoFixBtn.classList.remove('hidden');
    aiFixBtn.classList.remove('hidden');
  }
}

// ===== EDIT MODE =====
function toggleEdit() {
  const btn = $('#btn-edit');
  const preview = $('#eqf-preview');
  const editor = $('#eqf-editor');

  if (isEditing) {
    // Switch back to preview mode
    isEditing = false;
    btn.innerHTML = '✏️ Edit';
    editor.classList.add('hidden');
    preview.classList.remove('hidden');
    // Re-render highlighted preview with whatever they edited
    const codeEl = $('#eqf-code');
    codeEl.innerHTML = highlightEqf(currentEqf);
  } else {
    // Switch to edit mode
    if (!currentEqf) return;
    isEditing = true;
    btn.innerHTML = '✅ Done';
    editor.value = currentEqf;
    preview.classList.add('hidden');
    editor.classList.remove('hidden');
    editor.focus();
  }
}

// ===== COPY / DOWNLOAD / FIX =====
function handleCopy() {
  if (!currentEqf) return;
  navigator.clipboard.writeText(currentEqf).then(() => {
    showToast('Copied to clipboard!');
  });
}

function handleDownload() {
  if (!currentEqf) return;

  // Extract quest name for filename
  const nameMatch = currentEqf.match(/questname\s+"([^"]+)"/);
  const name = nameMatch ? nameMatch[1].replace(/\s+/g, '_').toLowerCase() : 'quest';

  const blob = new Blob([currentEqf], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.eqf`;
  a.click();
  URL.revokeObjectURL(url);
  isDirty = false;
  showToast(`Downloaded ${name}.eqf`);
}

let preFixEqf = null; // stored before AI fix for revert

/** Local-only fix — no AI, instant. */
function handleAutoFix() {
  if (!currentEqf) return;

  const beforeEqf = currentEqf;
  const localFixed = localAutoFix(currentEqf);

  if (localFixed === currentEqf) {
    showStatus('No mechanical issues found to auto-fix.', 'info');
    setTimeout(() => $('#generate-status').classList.add('hidden'), 3000);
    return;
  }

  currentEqf = localFixed;
  isDirty = true;
  updatePreview();

  const fixCount = countLocalFixes(beforeEqf, currentEqf);
  preFixEqf = beforeEqf;
  showDiff(beforeEqf, currentEqf);

  const postResult = validateEqf(currentEqf);
  if (postResult.valid && postResult.warnings.length === 0) {
    showStatus(`All ${fixCount} issue(s) auto-fixed locally 🔧`, 'success');
  } else {
    const remaining = [...postResult.errors, ...postResult.warnings].length;
    showStatus(`Fixed ${fixCount} issue(s) locally 🔧 — ${remaining} remaining issue(s) may need AI`, 'success');
  }

  $('#refine-section').classList.remove('hidden');
}

/** Fix with AI — runs local auto-fix first, then sends remaining issues to AI. */
async function handleFixWithAI() {
  if (!currentEqf) return;

  const btn = $('#btn-fix-ai');
  const autoBtn = $('#btn-auto-fix');
  btn.disabled = true;
  autoBtn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Fixing...';

  // Capture the "before" state for diff/revert
  const beforeEqf = currentEqf;

  try {
    // ── Pass 1: Local auto-fix (no AI needed) ──
    const localFixed = localAutoFix(currentEqf);
    const localChanged = localFixed !== currentEqf;
    currentEqf = localFixed;

    // Check what's left after local fixes
    const postLocalResult = validateEqf(currentEqf);
    const postLocalClean = postLocalResult.valid && postLocalResult.warnings.length === 0;

    if (postLocalClean) {
      // Local fixes resolved everything!
      isDirty = true;
      updatePreview();
      showStatus('All issues auto-fixed locally 🔧 — no AI needed!', 'success');

      if (localChanged) {
        preFixEqf = beforeEqf;
        showDiff(beforeEqf, currentEqf);
      }
      $('#refine-section').classList.remove('hidden');
      return;
    }

    // ── Pass 2: AI fix for remaining issues ──
    if (!isConfigured()) {
      // Local fixes helped but there are remaining issues that need AI
      if (localChanged) {
        isDirty = true;
        updatePreview();
        preFixEqf = beforeEqf;
        showDiff(beforeEqf, currentEqf);

        const remaining = [...postLocalResult.errors, ...postLocalResult.warnings];
        const list = remaining.map(i => `• ${i}`).join('\n');
        showStatus(
          `Fixed ${countLocalFixes(beforeEqf, currentEqf)} issue(s) locally, but ${remaining.length} remain that need AI:\n${list}\n\nConfigure an API key in ⚙️ Settings to fix these.`,
          'error'
        );
      } else {
        showStatus('These issues need AI to fix. Configure an API key in ⚙️ Settings.', 'error');
      }
      $('#refine-section').classList.remove('hidden');
      return;
    }

    showStatus('Local fixes applied, sending remaining issues to AI...', 'info');

    const audit = await auditQuest(currentEqf, validateEqf, (status) => {
      showStatus(status, 'info');
    });

    currentEqf = audit.eqf;
    isDirty = true;
    updatePreview();

    if (audit.wasFixed && audit.finalValid) {
      showStatus(`Quest fully fixed 🔧 (AI fixed: ${audit.issues.join('; ')})`, 'success');
    } else if (audit.wasFixed && !audit.finalValid) {
      const remaining = audit.remainingIssues.map(i => `• ${i}`).join('\n');
      showStatus(
        `Partially fixed — ${audit.remainingIssues.length} issue(s) remain:\n${remaining}\n\nTry using refine to fix these manually.`,
        'error'
      );
    } else if (!audit.wasFixed && audit.issues.length > 0) {
      const issueList = audit.issues.map(i => `• ${i}`).join('\n');
      showStatus(
        `AI could not fix ${audit.issues.length} issue(s):\n${issueList}\n\nTry using the refine input below to explain how to fix these.`,
        'error'
      );
    } else {
      showStatus('Quest is already valid ✅', 'success');
    }

    // Show diff for the full before→after (local + AI combined)
    if (beforeEqf !== currentEqf) {
      preFixEqf = beforeEqf;
      showDiff(beforeEqf, currentEqf);
    }

    $('#refine-section').classList.remove('hidden');
  } catch (err) {
    showStatus(`Fix failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    autoBtn.disabled = false;
    btn.innerHTML = '🤖 Fix with AI';
  }
}

/**
 * Apply deterministic, mechanical fixes that don't need AI.
 * These match the exact patterns flagged by eqf-validator.js warnings.
 */
function localAutoFix(eqf) {
  let fixed = eqf;

  // Fix: Space before "(" in function calls — e.g. "ShowHint (" → "ShowHint("
  // Matches: action/rule FunctionName (args) pattern with a space before the paren
  fixed = fixed.replace(/^(\s*(?:action|rule)\s+\w+)\s+\(/gm, '$1(');

  // Also fix conditional lines: if/else if FunctionName (args)
  fixed = fixed.replace(/^(\s*(?:if|else\s+if)\s+\w+)\s+\(/gm, '$1(');

  // Fix: Numeric arguments quoted as strings — e.g. GiveItem("123", 1) → GiveItem(123, 1)
  // This is trickier and more context-dependent, so we skip it for now to avoid
  // accidentally breaking string args that happen to look numeric.

  return fixed;
}

/** Count how many lines differ between two EQF strings (rough fix count). */
function countLocalFixes(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  let count = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

// ===== DIFF VIEW =====

/**
 * Compute a simple line-level diff between two text strings.
 * Returns an array of {type, text} where type is 'same', 'add', or 'remove'.
 */
function computeLineDiff(before, after) {
  const linesA = before.split('\n');
  const linesB = after.split('\n');

  // Simple LCS-based diff
  const m = linesA.length, n = linesB.length;
  // Build LCS length table
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (linesA[i] === linesB[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Walk the table to produce diff
  const result = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && linesA[i] === linesB[j]) {
      result.push({ type: 'same', text: linesA[i] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'add', text: linesB[j] });
      j++;
    } else {
      result.push({ type: 'remove', text: linesA[i] });
      i++;
    }
  }
  return result;
}

function showDiff(before, after) {
  const diffLines = computeLineDiff(before, after);
  const panel = $('#diff-panel');
  const content = $('#diff-content');

  content.innerHTML = diffLines.map(line => {
    const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
    const cls = line.type === 'add' ? 'diff-add' : line.type === 'remove' ? 'diff-remove' : 'diff-same';
    const escaped = line.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="diff-line ${cls}"><span class="diff-prefix">${prefix}</span>${escaped}</div>`;
  }).join('');

  panel.classList.remove('hidden');

  // Wire revert + dismiss buttons (one-time)
  const revertBtn = $('#btn-revert-fix');
  const dismissBtn = $('#btn-dismiss-diff');
  const onRevert = () => {
    if (preFixEqf !== null) {
      currentEqf = preFixEqf;
      isDirty = true;
      preFixEqf = null;
      updatePreview();
      hideDiff();
      showToast('Reverted to pre-fix version');
    }
  };
  const onDismiss = () => {
    preFixEqf = null;
    hideDiff();
  };

  revertBtn.replaceWith(revertBtn.cloneNode(true));
  dismissBtn.replaceWith(dismissBtn.cloneNode(true));
  $('#btn-revert-fix').addEventListener('click', onRevert);
  $('#btn-dismiss-diff').addEventListener('click', onDismiss);
}

function hideDiff() {
  $('#diff-panel').classList.add('hidden');
  $('#diff-content').innerHTML = '';
}


// ===== REFERENCE PANEL =====
function initReferencePanel() {
  renderReferenceTab('npcs');
}

function renderReferenceTab(tab) {
  const content = $('#reference-content');
  const search = $('#reference-search').value.toLowerCase();

  let items = [];
  switch (tab) {
    case 'npcs': {
      const npcs = getNpcs();
      items = npcs.filter(n => !search || n.name.toLowerCase().includes(search) || String(n.id).includes(search))
        .map(n => {
          const details = [];
          if (n.typeName) details.push(n.typeName);
          if (n.hp) details.push(`HP:${n.hp}`);
          if (n.exp) details.push(`EXP:${n.exp}`);
          if (n.boss) details.push('⭐ Boss');
          return refItem(n.id, n.name, details.join(' · '));
        });
      break;
    }
    case 'items': {
      const itemList = getItems();
      items = itemList.filter(i => !search || i.name.toLowerCase().includes(search) || String(i.id).includes(search))
        .map(i => {
          const details = [];
          if (i.typeName) details.push(i.typeName);
          if (i.minDamage || i.maxDamage) details.push(`DMG:${i.minDamage}-${i.maxDamage}`);
          if (i.armor) details.push(`ARM:${i.armor}`);
          return refItem(i.id, i.name, details.join(' · '));
        });
      break;
    }
    case 'spells': {
      const spells = getSpells();
      if (spells.length === 0) {
        items = ['<div style="color: var(--text-muted); padding: 20px; text-align: center;">No spells loaded. Upload an ESF file in Settings.</div>'];
      } else {
        items = spells.filter(s => !search || s.name.toLowerCase().includes(search) || String(s.id).includes(search))
          .map(s => {
            const details = [];
            if (s.typeName) details.push(s.typeName);
            if (s.tpCost) details.push(`TP:${s.tpCost}`);
            if (s.minDamage || s.maxDamage) details.push(`DMG:${s.minDamage}-${s.maxDamage}`);
            if (s.hpHeal) details.push(`Heal:${s.hpHeal}`);
            return refItem(s.id, s.name, details.join(' · '));
          });
      }
      break;
    }
    case 'classes': {
      const classes = getClasses();
      items = classes.filter(c => !search || c.name.toLowerCase().includes(search) || String(c.id).includes(search))
        .map(c => {
          const stats = [];
          if (c.str) stats.push(`STR:${c.str}`);
          if (c.intl) stats.push(`INT:${c.intl}`);
          if (c.wis) stats.push(`WIS:${c.wis}`);
          if (c.agi) stats.push(`AGI:${c.agi}`);
          if (c.con) stats.push(`CON:${c.con}`);
          if (c.cha) stats.push(`CHA:${c.cha}`);
          return refItem(c.id, c.name, stats.join(' · '));
        });
      break;
    }
    case 'actions':
      items = ACTIONS.filter(a => !search || a.name.toLowerCase().includes(search))
        .map(a => refItemAction(a.name, a.args.map(arg => arg.optional ? `[${arg.name}]` : arg.name).join(', '), a.desc));
      break;
    case 'rules':
      items = RULES.filter(r => !search || r.name.toLowerCase().includes(search))
        .map(r => refItemAction(r.name, r.args.map(arg => arg.optional ? `[${arg.name}]` : arg.name).join(', '), r.desc));
      break;
  }

  content.innerHTML = items.length
    ? items.join('')
    : '<div style="color: var(--text-muted); padding: 20px; text-align: center;">No results found</div>';
}

function refItem(id, name, detail) {
  return `<div class="ref-item" onclick="navigator.clipboard.writeText('${id}')">
    <span class="ref-item-id">${id}</span>
    <span class="ref-item-name">${name}</span>
    ${detail ? `<span class="ref-item-detail">${detail}</span>` : ''}
  </div>`;
}

function refItemAction(name, args, desc) {
  return `<div class="ref-item" onclick="navigator.clipboard.writeText('${name}(${args})')">
    <span class="ref-item-name" style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">
      ${name}(<span style="color: var(--text-muted)">${args}</span>)
    </span>
    <span class="ref-item-detail">${desc}</span>
  </div>`;
}

function handleReferenceSearch() {
  const activeTab = $('.tab-btn.active')?.dataset.tab || 'npcs';
  renderReferenceTab(activeTab);
}

// ===== SETTINGS =====
function initSettings() {
  const key = getApiKey();
  if (key) {
    $('#api-key-input').value = key;
  }

  const model = getModel();
  $('#model-select').value = model;

  // Update AI button state
  if (!isConfigured()) {
    $('#btn-generate-ai').title = 'Configure API key in Settings first';
  }
}

function handleSaveKey() {
  const key = $('#api-key-input').value.trim();
  setApiKey(key);
  showToast(key ? 'API key saved!' : 'API key cleared');
  if (key) {
    $('#btn-generate-ai').title = '';
  }
}

async function handleTestConnection() {
  const btn = $('#btn-test-connection');
  const status = $('#connection-status');

  btn.disabled = true;
  btn.textContent = '⏳ Testing...';
  status.textContent = '';
  status.className = 'connection-status';

  const result = await testConnection();

  status.textContent = result.message;
  status.className = `connection-status ${result.success ? 'success' : 'error'}`;
  btn.disabled = false;
  btn.textContent = '🔌 Test Connection';
}

// ===== PANELS =====
function togglePanel(id) {
  const panel = $(`#${id}`);
  const overlay = $('#overlay');
  const isOpen = panel.classList.contains('visible');

  closeAllPanels();

  if (!isOpen) {
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    // Force reflow for transition
    panel.offsetHeight;
    panel.classList.add('visible');
    overlay.classList.add('visible');
  }
}

function closePanel(id) {
  const panel = $(`#${id}`);
  const overlay = $('#overlay');
  panel.classList.remove('visible');
  overlay.classList.remove('visible');
  setTimeout(() => {
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 400);
}

function closeAllPanels() {
  ['quest-folder-panel', 'reference-panel', 'settings-panel'].forEach(id => {
    const panel = $(`#${id}`);
    if (panel.classList.contains('visible')) {
      closePanel(id);
    }
  });
}

// ===== UI HELPERS =====
function showStatus(message, type = 'info') {
  const status = $('#generate-status');
  status.classList.remove('hidden', 'error', 'success');
  if (type === 'error') status.classList.add('error');
  if (type === 'success') status.classList.add('success');

  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '<span class="spinner"></span>';
  const htmlMessage = message.replace(/\n/g, '<br>');
  status.innerHTML = `${icon} ${htmlMessage}`;

  if (type === 'success') {
    setTimeout(() => status.classList.add('hidden'), 4000);
  }
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== QUEST FOLDER =====

async function initQuestFolder() {
  // Show/hide "Save to Folder" button based on directory access
  updateSaveFolderBtn();

  // Try to restore previously-opened folder
  const result = await restoreSavedFolder();
  if (result && result.count > 0) {
    const statusEl = $('#quest-folder-status');
    statusEl.textContent = `📂 ${result.count} quest${result.count !== 1 ? 's' : ''} restored`;
    $('#quest-folder-search-section').classList.remove('hidden');
    renderQuestList();
    updateSaveFolderBtn();
  }
}

async function handleOpenFolder() {
  const statusEl = $('#quest-folder-status');
  statusEl.textContent = '⏳ Opening folder...';

  try {
    const { count, errors } = await openQuestFolder();
    if (count === 0 && errors.length === 0) {
      statusEl.textContent = ''; // user cancelled
      return;
    }

    statusEl.textContent = `📂 ${count} quest${count !== 1 ? 's' : ''} loaded`;
    if (errors.length > 0) {
      showToast(`⚠️ ${errors.join(', ')}`);
    }

    // Show search bar and render list
    $('#quest-folder-search-section').classList.remove('hidden');
    renderQuestList();
    updateSaveFolderBtn();
  } catch (err) {
    statusEl.textContent = `❌ ${err.message}`;
  }
}

function renderQuestList() {
  const listEl = $('#quest-list');
  const search = ($('#quest-folder-search')?.value || '').toLowerCase();
  const quests = getQuestList();

  if (quests.length === 0) {
    listEl.innerHTML = `<div class="quest-list-empty">
      <span>📂</span>
      No quests loaded yet.<br>Click "Open Quest Folder" to get started.
    </div>`;
    return;
  }

  const filtered = search
    ? quests.filter(q => q.questName.toLowerCase().includes(search) || q.filename.toLowerCase().includes(search))
    : quests;

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="quest-list-empty">No quests match your search.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(q => {
    const badge = q.errorCount > 0 ? '❌' : q.warningCount > 0 ? '⚠️' : '✅';
    const stats = q.errorCount > 0
      ? `${q.errorCount} error${q.errorCount > 1 ? 's' : ''}`
      : q.warningCount > 0
        ? `${q.warningCount} warn`
        : 'valid';
    const isActive = loadedFromFile === q.filename ? 'active' : '';

    return `<div class="quest-list-item ${isActive}" data-filename="${q.filename}">
      <div class="quest-list-badge">${badge}</div>
      <div class="quest-list-info">
        <div class="quest-list-name">${q.questName}</div>
        <div class="quest-list-file">${q.filename}</div>
      </div>
      <div class="quest-list-stats">${stats}</div>
    </div>`;
  }).join('');

  // Attach click handlers
  listEl.querySelectorAll('.quest-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const filename = item.dataset.filename;
      requestLoadQuest(filename);
    });
  });
}

/**
 * Attempt to load a quest from the folder. If there are unsaved changes,
 * show the confirmation modal first.
 */
function requestLoadQuest(filename) {
  if (isDirty && currentEqf) {
    showUnsavedModal(filename);
  } else {
    loadQuestFromFolder(filename);
  }
}

function loadQuestFromFolder(filename) {
  const content = getQuestContent(filename);
  if (!content) {
    showToast(`❌ Could not read ${filename}`);
    return;
  }

  currentEqf = content;
  isDirty = false;
  loadedFromFile = filename;
  updatePreview();
  updateSaveFolderBtn();
  renderQuestList(); // update active highlight
  $('#refine-section').classList.remove('hidden');
  closePanel('quest-folder-panel');
  showToast(`Loaded: ${filename}`);
}

// ── Unsaved Changes Modal ────────────────────────────────────

let pendingLoadFilename = null;

function showUnsavedModal(filename) {
  pendingLoadFilename = filename;
  $('#unsaved-modal').classList.remove('hidden');

  // Wire one-time handlers
  const cleanup = () => {
    $('#unsaved-modal').classList.add('hidden');
    $('#btn-modal-save').removeEventListener('click', onSave);
    $('#btn-modal-discard').removeEventListener('click', onDiscard);
    $('#btn-modal-cancel').removeEventListener('click', onCancel);
  };

  const onSave = async () => {
    cleanup();
    await handleSaveToFolder();
    loadQuestFromFolder(pendingLoadFilename);
  };

  const onDiscard = () => {
    cleanup();
    loadQuestFromFolder(pendingLoadFilename);
  };

  const onCancel = () => {
    cleanup();
    pendingLoadFilename = null;
  };

  $('#btn-modal-save').addEventListener('click', onSave);
  $('#btn-modal-discard').addEventListener('click', onDiscard);
  $('#btn-modal-cancel').addEventListener('click', onCancel);
}

// ── Save to Folder ───────────────────────────────────────────

async function handleSaveToFolder() {
  if (!currentEqf) return;

  try {
    let result;
    if (loadedFromFile) {
      // Save back to the same file
      result = await saveQuestToFolder(loadedFromFile, currentEqf);
      // Update in-memory copy so the quest list reflects changes
      updateQuestContent(loadedFromFile, currentEqf);
    } else {
      // Save as a new file
      result = await saveNewQuestToFolder(currentEqf);
      loadedFromFile = result.filename;
    }

    isDirty = false;
    updateSaveFolderBtn();
    renderQuestList();

    if (result.method === 'directory') {
      showToast(`✅ Saved to folder: ${loadedFromFile}`);
    } else {
      showToast(`💾 Downloaded: ${loadedFromFile}`);
    }
  } catch (err) {
    showToast(`❌ Save failed: ${err.message}`);
  }
}

function updateSaveFolderBtn() {
  const btn = $('#btn-save-folder');
  if (hasDirectoryAccess() || getQuestCount() > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}
