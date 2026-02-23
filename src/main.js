/**
 * Quest Generator — Main Application Entry Point
 * Wires together all modules: AI generation, templates, preview, validation, reference, pub file loading.
 */
import './style.css';
import { ACTIONS, RULES } from './quest-data.js';
import { getNpcs, getItems, getClasses, getSpells, SOUNDS, searchAll, setGameData, resetToDefaults, isCustomDataLoaded } from './reference-data.js';
import { TEMPLATES, generateFromTemplate } from './quest-builder.js';
import { generateQuest, refineQuest, getApiKey, setApiKey, getModel, setModel, isConfigured, testConnection } from './gemini-service.js';
import { highlightEqf } from './eqf-generator.js';
import { validateEqf } from './eqf-validator.js';
import { loadDataFiles, saveToStorage, loadFromStorage, clearStorage, getDataSummary } from './pub-loader.js';

// ===== STATE =====
let currentEqf = '';
let selectedTemplate = null;

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
    updatePreview();
    showStatus('Quest generated successfully!', 'success');
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
    updatePreview();
    showStatus('Quest refined!', 'success');
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
  const codeEl = $('#eqf-code');
  codeEl.innerHTML = highlightEqf(currentEqf);

  // Validate
  const result = validateEqf(currentEqf);
  const badge = $('#validation-badge');
  const details = $('#validation-details');

  badge.classList.remove('hidden');

  if (result.valid && result.warnings.length === 0) {
    badge.className = 'validation-badge valid';
    badge.innerHTML = '<span class="badge-icon">✅</span><span class="badge-text">Valid</span>';
    details.classList.add('hidden');
  } else if (result.valid) {
    badge.className = 'validation-badge warnings';
    badge.innerHTML = `<span class="badge-icon">⚠️</span><span class="badge-text">${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}</span>`;
    details.classList.remove('hidden');
    details.innerHTML = result.warnings.map(w => `<div class="validation-warning">${w}</div>`).join('');
  } else {
    badge.className = 'validation-badge invalid';
    badge.innerHTML = `<span class="badge-icon">❌</span><span class="badge-text">${result.errors.length} error${result.errors.length > 1 ? 's' : ''}</span>`;
    details.classList.remove('hidden');
    details.innerHTML =
      result.errors.map(e => `<div class="validation-error">${e}</div>`).join('') +
      result.warnings.map(w => `<div class="validation-warning">${w}</div>`).join('');
  }
}

// ===== COPY / DOWNLOAD =====
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
  showToast(`Downloaded ${name}.eqf`);
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
  ['reference-panel', 'settings-panel'].forEach(id => {
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
  status.innerHTML = `${icon} ${message}`;

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
