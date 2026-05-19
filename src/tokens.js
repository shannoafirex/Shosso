// Estimador char/4. Suficiente para previews relativos.
// Los tokens REALES del run vienen en `usage` del API y se muestran aparte.
// For content blocks we inspect known text-bearing fields directly instead
// of JSON.stringify'ing the whole object — large tool_use inputs (e.g. a
// file write with a megabyte payload) would otherwise serialize on every
// Context.refresh() and cause UI jank.
window.estimateTokens = function (text) {
  if (text == null) return 0;
  if (typeof text === 'string') return Math.ceil(text.length / 4);
  if (typeof text === 'number' || typeof text === 'boolean') return 1;
  if (typeof text === 'object') {
    // Anthropic block shapes: text, tool_use{input}, tool_result{content}, image{source.data}
    if (typeof text.text === 'string') return Math.ceil(text.text.length / 4);
    if (text.type === 'tool_use' && text.input != null) {
      try { return Math.ceil(JSON.stringify(text.input).length / 4); } catch { return 0; }
    }
    if (text.type === 'tool_result') {
      const c = text.content;
      if (typeof c === 'string') return Math.ceil(c.length / 4);
      if (Array.isArray(c)) {
        let t = 0;
        for (const x of c) t += window.estimateTokens(x);
        return t;
      }
      return 0;
    }
    if (text.type === 'image') return 1500; // rough Anthropic image cost
    try { return Math.ceil(JSON.stringify(text).length / 4); } catch { return 0; }
  }
  return 0;
};
window.formatTokens = function (n) {
  if (typeof n !== 'number' || !isFinite(n)) return '0';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(Math.round(n));
};
window.escapeHtml = function (str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
};
