# Nexo — prototipo de servicios del campus (Unimet)

Prototipo clicable y responsive (móvil, iPad, escritorio) de **Nexo**, la app de servicios estudiantiles de la Universidad Metropolitana. Nació de wireframes en Figma (archivo `aEHiWasJHowmsGQU07wYGh`, sección `7:79450`) y se desarrolla pantalla por pantalla. Todo está en español (Venezuela).

Es un prototipo: no hay backend. Los datos viven en el navegador (localStorage/sessionStorage) y los pagos, correos y códigos son simulados.

## Cómo correrlo

- Abrir `index.html` directamente en el navegador, o
- `npm run dev` → sirve la carpeta en http://localhost:3000
- Un solo archivo para compartir: `npm run build` → `dist/nexo-prototipo.html` (CSS, JS e íconos adentro; `dist/` no se versiona)
- Prueba de humo: `npm test` (necesita `pip install playwright` y `playwright install chromium`)

Cuentas de prueba: estudiante `ana.torres@correo.unimet.edu.ve` / `demo-nexo-01` (carnet 20241010186); administradora `maria.vera@unimet.edu.ve` / `demo-admin-01`; moderadores `lucia.rojas@unimet.edu.ve` / `demo-mod-01` y `carlos.gil@unimet.edu.ve` / `demo-mod-02`; creador `diego.mendez@unimet.edu.ve` / `demo-creador-01`; comercios `<local>@comercio.nexo` / `demo-local-01` (pinchopan, lapausa, migrill, teeb, tienditaa1, tienditaa2, believe). Cualquier cuenta nueva que se registre empieza desde cero.

## Estructura

| Archivo | Qué tiene |
|---|---|
| `index.html` | Todas las pantallas como `<section class="screen" id="…">`. Las que llevan menú lateral/barra son `section.screen.app` |
| `css/styles.css` | Tokens de color en `:root` (+ modo oscuro), componentes y breakpoints |
| `js/data.js` | `MATDB` (código → nombre de materia, 664) y `CARRERAS` (carrera → códigos separados por espacio, 22 carreras), sacados de los flujogramas de pregrado de la Unimet |
| `js/app.js` | Toda la lógica: navegación, cuentas, wallet, pagos, notificaciones, etc. |
| `tests/smoke.py` | Prueba de humo con Playwright |

Orden de carga (importa): Lucide (CDN) → `data.js` → `app.js`. Son scripts clásicos, no módulos: comparten el ámbito global, así que `app.js` usa `MATDB`/`CARRERAS` directamente.

## Arquitectura de `app.js`

**Navegación por hash.** `show(id)` muestra una pantalla y oculta las demás; `go(id)` navega. Atributos delegados en el HTML:
`data-go="pantalla"`, `data-go-prev`, `data-toast="mensaje"`, `data-copy`, `data-eye` (ver contraseña), `data-logout`.
Pantallas: tutorial, login, registro, ayuda, inicio, servicios, comida, local, detalle, carrito, comprobante, factura, actividad, estacionamiento, vehiculo, pagoplan, planes, recarga, afiliar, pagomovil, acceso, inscripcion, materias, caja, tarjeta, reserva, revision, qr, soporte, notificaciones, perfil.

**Marco de la app.** Para cada `section.app`, JS construye el menú lateral, la barra móvil (atrás, campana, avatar → perfil), la barra de escritorio (Volver, migas, trimestre, campana) y la barra de pestañas móvil a partir de `data-title`, `data-back`, `data-tab` y `data-crumb`.

**Cuentas y sesión.**
- `localStorage["nexo-accounts"]`: lista de cuentas. La contraseña se guarda transformada con `passKey()`, nunca en claro.
- Sesión en `nexo-session` (localStorage si marcó "Recordarme", si no sessionStorage).
- `isDemo` es verdadero solo para Ana. Al arrancar se eliminan los elementos `[data-new]` (si es demo) o `[data-demo]` (si es cuenta nueva).
- Datos por cuenta con `K("nexo-…")` = clave + `":" + correo`: nexo-pagos, nexo-cards, nexo-nread, nexo-nprefs, nexo-sim, nexo-wallet, nexo-moves, nexo-pendrec, nexo-vehicle, nexo-plan, nexo-materias, nexo-cart, nexo-orders. Si el usuario cambia su correo, estas claves se migran.
- `saveAccount({...})` actualiza la cuenta activa (nombre, correo, carrera, cédula, teléfono, etc.).

**Estado de cuenta / matrícula.**
- Trimestre `TRIM_ID = "2026-sep-nov"` con 3 facturas: septiembre, octubre, noviembre (`MONTHS`).
- Precio por materia: `PRICE_REG = 160`, pronto pago `PRICE_PP = 150` (del segundo lunes del mes hasta ese viernes). Vencen el día 20.
- Estados de factura: pagada, revision, externa, futura, pronto, pendiente, vencida. No se permiten pagos adelantados.
- Las 3 facturas aplican a toda cuenta, aunque se cree a mitad del trimestre. En `#inscripcion` (`#insPaid`, `renderInsPaid`) el estudiante marca los meses ya emitidos que pagó fuera de Nexo → `pagos[id] = { estado: "externa" }` ("Pagada fuera de Nexo", no suma al total pagado en Nexo). Por defecto vienen marcados los meses anteriores a la creación de la cuenta; se puede cambiar al editar las materias.
- Antes de ver el estado de cuenta, el estudiante registra sus materias en `#inscripcion` (carrera + cantidad + nombre o código). `findSubject(texto, carrera)` resuelve nombre o código contra `MATDB` (sin importar acentos ni mayúsculas).
- `simDate`: chips para simular fechas entre el 1 sep y el 30 nov.

**Estacionamiento.** Wallet Nexo con recargas (tarjeta afiliada o Pago Móvil; el formulario de Pago Móvil valida todo a la vez con `pmCheck`/`pmShow`: prefijo de celular, cédula V/E de 6–8/9 dígitos o RIF J de 9, referencia de 6+ dígitos y no repetida, fecha no futura y de los últimos 7 días, monto en Bs. = recarga × `BCV_REF` con tolerancia −1 %/+5 %; `BCV_REF` es una tasa ilustrativa), registro de vehículo (marca, modelo, año, placa), planes (incluye bimestral y trimestral) pagados con saldo y verificación por código de 6 dígitos enviado al correo (simulado: 10 min de validez, reenvío a los 30 s, 3 intentos).

**Comida y kioscos.** Los menús salen de `LOCALES` en `app.js` (4 locales + 3 kioscos; cada uno con categorías → productos; `foodOpt()` define grupos de opciones de "elige una" con recargo). Las pantallas `#comida`, `#local`, `#detalle`, `#carrito` se pintan con `renderFoodList/renderLocal/renderDetalle/renderCarrito` desde `show()`; el local y el producto abiertos viven en `sessionStorage["nexo-food"]`.
- Carrito por cuenta en `nexo-cart` (`{ local, lines:[{item, sel, qty, note}] }`): un solo local por pedido; al añadir de otro local se avisa y se vacía. La cuenta demo arranca con el almuerzo del día de Pincho Pan.
- Pago con tarjeta (simulado) → crea el pedido y va a `#pedido` (seguimiento). Transferencia → `#comprobante` (borrador `draftOrder`) → al enviar, se confirma. Los pedidos se guardan en `nexo-orders` y se agregan a Actividad con `addMovement(..., { order })`; el botón lleva `data-order` para abrir esa factura.
- `#factura` sin pedido elegido muestra la factura de ejemplo original (`FC_SAMPLE`).
- Seguimiento (`#pedido`, `renderPedido`): al confirmar, el pedido guarda `paidAt`, `readyAt` (= pago + punto medio del `eta` del local, `prepMinutes`) y `code` (`pickupCode`, 4 dígitos). `orderStatus()`: preparando → listo (al pasar `readyAt`) → retirado (`pickedAt`, botón "Ya lo retiré"). `checkOrders()` corre cada 15 s: avisa con toast y `foodNotifs()` agrega la notificación (va a `#pedido` con `trackId`). En `#comida`, `#foodOrders` muestra los pedidos activos. Hay un enlace de prototipo para simular que ya está listo. `drawQR(canvas)` dibuja el QR ilustrativo.

**Roles y soporte (Figma sección `7:79457` · 08 Roles y gestión).** Las cuentas tienen `role`: estudiante (por defecto), `creator`, `admin`, `mod` o `local` (`roleOf()`); `disabled` bloquea el login. Las cuentas de gestión de ejemplo están en `STAFF0`.
- Las pantallas de gestión llevan `data-staff="admin"|"mod"`: el marco usa `STAFF_NAV` (menú propio, botón Salir, sin campana). `show()` redirige según `STAFF_SCREENS`/`ROLE_HOME`: el estudiante no entra a gestión; cada rol solo entra a su gestión; los comercios no entran a pantallas de estudiante.
- **Modo usuario:** creador, admin y moderador también pueden usar las pantallas de estudiante con su cuenta (pedir comida, estacionamiento, canchas, soporte). El último modo se guarda en `nexo-mode:<correo>` y al iniciar sesión vuelven a él (`#inicio` o su inicio de gestión). Las cuentas sin carnet no ven el estado de cuenta universitario (materias/caja/tarjeta/inscripcion/revision redirigen al inicio y se ocultan sus accesos).
- **Menú de usuario** (`openUserMenu`, módulo "Menú de usuario y cambio de modo"): lo abre cualquier `[data-usermenu]` (avatar de la barra móvil y de escritorio, y el perfil del menú lateral). Muestra datos de la cuenta, el selector Modo gestión / Modo usuario (solo personal), Mi cuenta, Notificaciones, Actividad, Soporte y Cerrar sesión; en móvil es una hoja inferior. Se cierra con Esc o al tocar fuera. En modo usuario hay además un botón "Ir a gestión" en la barra y "Volver a gestión" en el menú lateral (`[data-mode-switch]`).
- Administración: `#gestion` (indicadores, tabla filtrable, asignar moderador, exportar CSV, invitar), `#equipo` (activar/desactivar, cancelar invitaciones), `#caso` (ticket en solo lectura). Moderación: `#moderacion` (cola, conversación, responder, reembolsar/cancelar con confirmación, resolver/reabrir) y `#resueltos`.
- Los tickets son **globales** en `localStorage["nexo-tickets"]` (no por cuenta), sembrados con `seedTickets()`. Las invitaciones en `nexo-invites` (`newInvite`: `role`, `token`, `exp` a 7 días, `byName`). La persona invitada activa su cuenta **sin carnet** en `#invitacion` (pantalla pública): por enlace `#invitacion-<token>` ("Copiar enlace" en el equipo) o buscando su correo; si intenta registrarse como estudiante con ese correo, se la desvía ahí. Vencidas se reenvían (token nuevo) desde el menú ⋯ del creador. Un reembolso agrega un movimiento a `nexo-moves:<correo del estudiante>`.
- Creador (Figma `2:25763` y `2:25970`): `#creador` (indicadores, gráfico de ingresos por comisiones con tooltip y vista de tabla, compras por servicio; métricas de ejemplo en `PERIODS`, ingresos = volumen × comisión), `#creador-equipo` (equipo con menú ⋯ para cambiar rol/desactivar, invitar admin o moderador, centro de soporte con respuesta, reembolso, cancelación y resolver), `#movimientos` (transacciones de `nexo-orders:*` y reembolsos + registro de cambios) y `#config` (comisiones por servicio en `nexo-config`, restablecer datos de ejemplo). Movimientos y Configuración no tienen diseño en Figma.
- Registro de auditoría global en `nexo-audit` con `logAudit(tipo, texto)`; las acciones de tickets compartidas son `ticketReply`, `ticketAction` y `ticketResolve`.
- Comercio (`role: "local"`, la cuenta lleva `local: <id>`; sin diseño en Figma): `#local-pedidos` (tablero En preparación / Listos / Entregados hoy; marcar listo, demora +5 min, cancelar con reembolso al estudiante, entregar verificando el código de 4 dígitos, pausar pedidos) y `#local-menu` (productos agotados, pausa). El comercio lee y escribe los pedidos en `nexo-orders:<correo del estudiante>` (`allOrders`, `updateOrder`); siembra pedidos de ejemplo una vez por local (`nexo-localseed:<id>`). Agotados y pausa viven en `nexo-localstate` (global) y la vista del estudiante los respeta (no deja abrir, añadir ni pagar). Si el local no actúa, el pedido igual pasa a listo por tiempo. Un listener de `storage` refresca las pantallas cuando otra pestaña cambia pedidos, tickets o el estado de un local (dos pestañas con cuentas distintas: iniciar sesión sin "Recordar").
- Estudiante: `#soporte` lista sus tickets (`renderSoporte`), crea solicitudes (`#supForm`, puede ligar un pedido de `nexo-orders`) y responde en la conversación.

## Cómo trabajar con el usuario

- Cuando haya que elegir entre opciones (qué mejorar, decisiones de diseño, etc.), preséntalas siempre como un formulario de un clic (herramienta de preguntas con opciones), no como una lista en texto. Marca la recomendada.

## Convenciones

- Textos de interfaz en español, tono cercano (tú). Montos con `money(n)` → `$1.234,56`.
- Íconos: Lucide (`<i data-lucide="nombre">`); llamar `lucide.createIcons()` tras insertar HTML nuevo.
- Usar `el.hidden` para mostrar/ocultar (hay `[hidden]{display:none!important}`).
- Envolver todo acceso a localStorage en `try/catch`. Al inicio de `app.js` hay un respaldo: si el navegador bloquea localStorage/sessionStorage (vistas previas, iframes aislados), se usa `window.name`, que sobrevive a las recargas de la pestaña. No quitarlo: el registro y el login recargan la página.
- Código nuevo de pantallas: insertarlo en `app.js` antes del bloque `document.querySelectorAll("form[data-submit]")`.
- Al tocar algo que se inicializa al arrancar, cuidado con el orden de `let`/`const` (ya hubo errores de TDZ con `plan` y `vehicle`).
- No pedir ni mostrar datos reales de tarjetas; los datos de Pago Móvil de destino son ilustrativos.

## Pendiente / ideas

- Ingeniería Mecánica no tiene materias en `CARRERAS`: su flujograma en PDF tiene el texto convertido en curvas y no se pudo extraer.
- El código `EI27` (Contrataciones Internacionales) viene así en el flujograma; parece incompleto.
- Comida: los menús y precios son de ejemplo (confirmar con cada local); falta la validación de los datos de transferencia; el comercio no puede editar precios ni productos (solo agotar y pausar).
- Invitaciones: el envío por correo es simulado (se copia el enlace).

Fuente de materias: https://www.unimet.edu.ve/estudios/flujogramas-pregrado/
