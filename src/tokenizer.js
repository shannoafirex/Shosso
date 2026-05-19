window.Tokenizer = {
  init() {
    const inp = document.getElementById('tk-input');
    if (!inp) return;
    const update = () => {
      const s = inp.value;
      document.getElementById('tk-chars').textContent = String(s.length);
      document.getElementById('tk-tokens').textContent = String(estimateTokens(s));
    };
    inp.addEventListener('input', update);
    update();
  }
};
