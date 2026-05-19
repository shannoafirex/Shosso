// Estimador char/4. Suficiente para previews relativos.
// Los tokens REALES del run vienen en `usage` del API y se muestran aparte.
window.estimateTokens = function (text) {
  if (text == null) return 0;
  const s = typeof text === 'string' ? text : JSON.stringify(text);
  return Math.ceil(s.length / 4);
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
