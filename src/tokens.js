// Aproximador de tokens. No es exacto (no es BPE real), pero es consistente
// y suficiente para visualizar la diferencia entre cargar el body de una
// skill vs. sólo su nombre + descripción.
window.estimateTokens = function (text) {
  if (!text) return 0;
  // Heurística estándar: ~4 chars por token en inglés/español promedio.
  return Math.max(1, Math.ceil(text.length / 4));
};

// Presupuesto de contexto del modelo (simulado).
window.CTX_LIMIT = 200_000;

// Tamaño del system prompt y harness (fijo, simulado).
window.SYSTEM_PROMPT_TOKENS = 4200;
window.HARNESS_TOOLS_TOKENS = 1800;
