window.Tokenizer = {
  init() {
    const inp = document.getElementById('tk-input');
    if (!inp) return;
    const charsEl = document.getElementById('tk-chars');
    const tokensEl = document.getElementById('tk-tokens');
    if (!charsEl || !tokensEl) return;
    // Debounce so that a 10MB paste doesn't fire on every IME keystroke.
    let timer = null;
    const update = () => {
      timer = null;
      const s = inp.value;
      charsEl.textContent = formatTokens(s.length);
      tokensEl.textContent = formatTokens(estimateTokens(s));
    };
    inp.addEventListener('input', () => {
      if (timer) return;
      timer = setTimeout(update, 60);
    });
    update();
  }
};
