# Shosso

Generador de **códigos QR dinámicos** y **enlaces cortos con analíticas**. Micro-SaaS freemium listo para desplegar.

- **Gratis:** hasta 3 enlaces/QR estáticos.
- **Pro (de pago):** enlaces ilimitados, QR **dinámicos** (cambias el destino sin reimprimir el código) y **analíticas de escaneos**.

Esa diferencia free/pro es lo que justifica el cobro: un QR impreso en un cartel o producto que puedes redirigir cuando quieras vale dinero para negocios.

## Probar en local

```bash
npm install
cp .env.example .env      # edita SESSION_SECRET
npm start                 # abre http://localhost:3000
```

## Stack

- Node.js + Express
- SQLite (better-sqlite3) — cero configuración, un archivo
- Stripe para suscripciones (opcional hasta que quieras cobrar)
- Frontend vanilla (sin build)

---

## Cómo convertirlo en $15/día — pasos que dependen de ti

Esto es la parte del mundo real que yo no puedo hacer por ti. $15/día ≈ $450/mes.
Si cobras **$9/mes** por el plan Pro, necesitas **~50 suscriptores**. Con **$19/mes**, ~24.

### 1. Desplegar (≈ $7/mes, cabe en tu presupuesto)
1. Sube este repo a GitHub (ya está hecho por mí en una rama).
2. Crea un servicio en [Render](https://render.com) o [Railway](https://railway.app):
   - Build: `npm install`
   - Start: `npm start`
   - **Añade un disco persistente** montado en `/data` y pon `DATA_DIR=/data` (si no, la BD se borra en cada redeploy).
3. Variables de entorno: `BASE_URL` (tu URL pública), `SESSION_SECRET` (genera con `openssl rand -hex 32`).
4. (Opcional) Compra un dominio corto (~$10/año). Los enlaces cortos lucen mejor con dominio corto.

### 2. Activar cobros con Stripe
1. Crea cuenta en [Stripe](https://stripe.com).
2. Crea un producto **Pro** con un precio **recurrente mensual** (ej. $9). Copia su `price_id`.
3. Rellena en las variables de entorno: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`.
4. Crea un webhook en Stripe apuntando a `https://TU_URL/api/stripe/webhook`, escuchando
   `checkout.session.completed` y `customer.subscription.deleted`. Copia el secreto en `STRIPE_WEBHOOK_SECRET`.
5. Listo: el botón "Mejorar a Pro" abrirá el checkout y, al pagar, el plan del usuario pasa a `pro` automáticamente.

### 3. Conseguir esos primeros clientes (lo más difícil, y es tu trabajo)
- Negocios locales con QR en menús, carteles, packaging, tarjetas → el QR dinámico les ahorra reimprimir.
- Publica en comunidades de pequeños negocios, marketing y emprendimiento.
- Ofrece el plan gratis como gancho; la gente paga cuando necesita cambiar un destino o ver escaneos.

### Honestidad sobre las expectativas
El código funciona. Los ingresos **no son automáticos**: dependen de que despliegues, cobres y consigas usuarios.
Nadie puede garantizarte $15/día — eso lo decide el mercado. Lo que tienes aquí es un producto vendible de verdad, sin humo.

## Roadmap sugerido (para subir ingresos)
- QR personalizables (color, logo en el centro) → función premium muy pedida.
- Analíticas por país/dispositivo (ya se guarda user-agent; falta geolocalización por IP).
- Dominios personalizados por cliente.
- Plan anual con descuento (mejora la retención).
