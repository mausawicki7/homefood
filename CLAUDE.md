# Homefood v2 — notas operativas

> Notas para retomar el trabajo desde cualquier máquina. **Este repo es público**: no anotar acá credenciales, datos de clientes ni IDs de pago.
> **No incluir este archivo en `homefood-v2.zip`**, porque quedaría publicado en la tienda (`_build-theme-zip.php` ya lo excluye).

## 2026-10-28 — Pedidos pagados con Mercado Pago que quedaban "Pendiente de pago"

**Síntoma:** a la dueña no le llegaba el mail de "Nuevo pedido" de algunas compras pagadas con Mercado Pago. Pasó con los pedidos 3252, 3265 y 3267, en ese caso con 3 días, unas 4 horas y casi un día de atraso.

**Causa:** los mails funcionan bien. WooCommerce manda "Nuevo pedido" cuando el pedido cambia de estado, y esos pedidos nunca pasaron de "Pendiente de pago" a "Procesando". Mercado Pago no le avisó a la tienda que el pago se había aprobado. El 26/10 a las 22:05 UTC, el registro del plugin mostró `Error getting last notification ... 404 KVS getValue not found`: el servicio de notificaciones de Mercado Pago no tenía ningún aviso de ese pago. Todo indica una falla del lado de Mercado Pago, no del tema. Pasa de vez en cuando y solo en Checkout Pro (`woo-mercado-pago-basic`, cuando el cliente paga en la página de MP). La mayoría de los pagos se sincroniza bien.

**Qué se hizo:**
- El 3267 se pasó a "Procesando" a mano por MCP y salieron los mails. El 3265 y el 3252 se habían destrabado antes, al abrirlos en el panel.
- En wp-admin → Mercado Pago → Ajustes → "2. Personaliza la información de tu negocio" → "Ver opciones avanzadas":
  - **Rastreo de orden: Cada 15 minutos** (estaba en Desactivada). El plugin consulta a MP el estado de los pedidos pendientes y los actualiza solo. Corre con WP-Cron, no con Action Scheduler. **Dejarlo activado.**
  - **Modo debug y log: activado**, para tener el registro completo la próxima vez que falle.

**Pendiente:**
- ⬜ **Apagar "Modo debug y log" alrededor del 2026-11-11.** Guarda datos de los clientes en los registros.
- ⬜ Confirmar que el rastreo funciona: tienen que aparecer registros de `mercadopago` en WooCommerce → Estado → Registros (las horas están en UTC), y el próximo pedido trabado tiene que pasar solo a "Procesando" en menos de 15 minutos.
- ⬜ Opcional: reclamarle a Mercado Pago. Los IDs de pago de los tres pedidos se ven en cada pedido, en el campo `_Mercado_Pago_Payment_IDs`.

**Si vuelve a pasar:** leer el pedido y sus notas por la REST API (`wc/v3/orders/<id>` y `/notes`). Si tiene `_Mercado_Pago_Payment_IDs` pero no tiene notas de "Mercado Pago: Pago aprobado", es este mismo problema. Revisar el registro `mercadopago*` del día.
