// Free vs Pro gating. Esto es lo que justifica el pago.
module.exports = {
  free: {
    name: 'Free',
    maxLinks: 3,        // como máximo 3 enlaces/QR
    dynamic: false,     // no puede cambiar el destino tras crearlo
    analytics: false,   // sin estadísticas de escaneos
  },
  pro: {
    name: 'Pro',
    maxLinks: Infinity, // ilimitados
    dynamic: true,      // QR dinámicos: cambia el destino sin reimprimir
    analytics: true,    // estadísticas completas de escaneos
  },
};
