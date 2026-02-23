/**
 * EQF Generator - Converts internal quest representation to formatted EQF text.
 * Also provides syntax highlighting for the preview panel.
 */

/**
 * Format an action call as EQF text.
 */
function formatAction(action) {
  const args = action.args.map(a => {
    if (typeof a === 'string') return `"${a}"`;
    return String(a);
  }).join(', ');
  return `${action.name}(${args})`;
}

/**
 * Generate a complete EQF file from a quest definition object.
 * @param {object} quest
 * @param {string} quest.name
 * @param {number} quest.version
 * @param {object} quest.options - hidden, disabled, etc.
 * @param {Array} quest.states - Array of state objects
 * @returns {string} Formatted EQF content
 */
export function generateEqf(quest) {
  let out = '';

  // Main block
  out += 'Main\n{\n';
  out += `\tquestname \t"${quest.name}"\n`;
  out += `\tversion\t\t${quest.version || 1}\n`;
  if (quest.options?.hidden) out += '\thidden\n';
  if (quest.options?.hiddenEnd) out += '\thidden_end\n';
  if (quest.options?.disabled) out += '\tdisabled\n';
  out += '}\n';

  // States
  for (const state of quest.states) {
    out += `\nstate ${state.name}\n{\n`;

    if (state.desc) {
      out += `\tdesc\t\t"${state.desc}"\n`;
    }

    if (state.actions?.length) {
      out += '\n';
      for (const action of state.actions) {
        if (action.cond === 'if') {
          out += `\tif ${formatAction(action.condExpr)} ${formatAction(action)};\n`;
        } else if (action.cond === 'elseif') {
          out += `\telseif ${formatAction(action.condExpr)} ${formatAction(action)};\n`;
        } else if (action.cond === 'else') {
          out += `\telse ${formatAction(action)};\n`;
        } else {
          out += `\taction\t\t${formatAction(action)};\n`;
        }
      }
    }

    if (state.rules?.length) {
      out += '\n';
      for (const rule of state.rules) {
        const ruleStr = formatAction(rule.expr);
        const actionStr = rule.action ? formatAction(rule.action) : `goto ${rule.goto}`;
        out += `\trule\t\t${ruleStr} ${actionStr}\n`;
      }
    }

    out += '}\n';
  }

  return out;
}

/**
 * Apply syntax highlighting to EQF text for HTML display.
 * @param {string} eqf - Raw EQF text
 * @returns {string} HTML with syntax highlighting spans
 */
export function highlightEqf(eqf) {
  if (!eqf) return '';

  return eqf.split('\n').map(line => {
    let highlighted = escapeHtml(line);

    // Keywords: Main, state, action, rule, desc, questname, version, if, elseif, else, goto, hidden, disabled
    highlighted = highlighted.replace(
      /\b(Main|state|action|rule|desc|questname|version|if|elseif|else|goto|hidden|hidden_end|disabled)\b/g,
      '<span class="eqf-keyword">$1</span>'
    );

    // Strings: "..."
    highlighted = highlighted.replace(
      /(&quot;[^&]*&quot;)/g,
      '<span class="eqf-string">$1</span>'
    );

    // Function names followed by (
    highlighted = highlighted.replace(
      /\b([A-Z]\w+)\s*\(/g,
      '<span class="eqf-function">$1</span>('
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span class="eqf-number">$1</span>'
    );

    // State names after "state" keyword
    highlighted = highlighted.replace(
      /(<span class="eqf-keyword">state<\/span>)\s+(\w+)/,
      '$1 <span class="eqf-state">$2</span>'
    );

    // Goto state name
    highlighted = highlighted.replace(
      /(<span class="eqf-keyword">goto<\/span>)\s+(\w+)/,
      '$1 <span class="eqf-state">$2</span>'
    );

    // Comments
    if (highlighted.trim().startsWith('//')) {
      highlighted = `<span class="eqf-comment">${highlighted}</span>`;
    }

    return highlighted;
  }).join('\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
