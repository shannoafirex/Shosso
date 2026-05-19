// Detector del patrón "you're absolutely right".
// Del podcast: "Le dices 'por qué no chequeaste Trustpilot?' y te responde
// 'tienes toda la razón'. Es frustrante. El modelo agrees con todo lo que
// le dices, en vez de tener convicción propia. Por eso hay que darle
// contexto y reglas duras."
//
// Aquí detectamos cuando el agente cae en esto y ofrecemos un botón para
// "desafiarlo" — obligándolo a justificar su cambio de opinión.

window.Sycophancy = {
  PATTERNS: [
    /tienes (toda la )?razón/i,
    /you'?re absolutely right/i,
    /you are correct/i,
    /excelente (punto|observación)/i,
    /great point/i,
    /perdón por (el error|la confusión)/i,
    /sorry for the confusion/i,
    /buena observación/i
  ],

  detect(text) {
    return this.PATTERNS.some(p => p.test(text));
  },

  // Cuando se detecta sycophancy en una respuesta del agente, añade un
  // banner de aviso debajo del mensaje con un botón para desafiar.
  wrap(messageEl, originalText) {
    if (!this.detect(originalText)) return;
    messageEl.classList.add('sycophancy');
    const warn = document.createElement('div');
    warn.className = 'mt-2 p-2 bg-warn/10 border border-warn/30 rounded text-[11px]';
    warn.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div>
          <b>⚠ Patrón "you're absolutely right".</b><br>
          El agente está cediendo sin verificar. Si tiene contexto, debería defender su posición.
        </div>
        <button class="sy-challenge text-[10px] px-2 py-1 rounded bg-warn text-bg hover:opacity-80 whitespace-nowrap">Desafiar</button>
      </div>
    `;
    warn.querySelector('.sy-challenge').onclick = () => {
      MockAgent.send('Antes de cambiar de opinión, dame las fuentes y razones por las que ahora dices lo contrario. No me des la razón si no estás convencido.');
    };
    messageEl.appendChild(warn);
  }
};
