# Asador Sensación · Fuego, raíces y encuentro

Web independiente con estética oscura, fotografía protagonista, naranja fuego y tipografía editorial, siguiendo la composición de la captura facilitada. Animación breve de apertura, sin bloquear acciones; respeta movimiento reducido.

## Abrir con Copilot / Codespaces

Desde la raíz de **WEBS-de-prueba**, actualizar primero el checkout conservando cambios locales. Ejecutar:

```sh
python3 asador-sensacion/server.py --host 0.0.0.0 --port 3003
```

Abrir el puerto **3003** desde el panel Puertos. No abrir 3002, que corresponde al restaurante anterior. También se incluye `asador-sensacion.code-workspace` con una tarea de arranque. No se ha configurado un despliegue público nuevo.

## Carta y fotografía

36 propuestas de cocina boliviana: entrantes, platos tradicionales, asador, sopas, platos de la tierra y postres/bebidas. Filtros, búsqueda sin tildes, orden por precio/nombre, fichas en modal, galería, selección con cantidades y total. No se envía ningún pedido.

**Platos, composición, precios en euros y disponibilidad son propuestas, no una carta comercial verificada.** Las recetas varían por región y casa; alérgenos y raciones deben confirmarse. `catalog.json` documenta los datos; la copia embebida de `dishes` en `app.js` permite que la web también funcione sin peticiones de datos. Mantener ambas sincronizadas al editar.

Se intentó consultar `https://en.wikipedia.org/wiki/Bolivian_cuisine` como referencia general; la política de red denegó el acceso. También estaban bloqueados Maps y tacosmyguey.com. La selección se elaboró a partir de platos tradicionales conocidos, sin atribuir fuentes no consultadas ni afirmar que el restaurante los sirve.

Imágenes nuevas generadas con IA: portada panorámica y lámina de 36 ilustraciones fotográficas de platos, en el mismo estilo de luz cálida y fondo oscuro. Las tarjetas muestran celdas de esa lámina mediante CSS. Son representaciones artísticas, no fotografías de platos reales ni documentación exacta de recetas. Las fotos originales del chat no estaban disponibles como archivos locales; no se presentan estas imágenes como fotos del restaurante. Fuentes locales Bodoni Moda y DM Sans, licencias adjuntas.

## Solicitudes de mesa

Python 3.12+, sin dependencias externas. Por defecto, el formulario **prepara una solicitud descargable sin enviarla** y muestra la llamada al 946 09 59 75. Una solicitud nunca equivale a una reserva confirmada.

Registro compartido de prueba: arrancar con `SENSACION_ACCEPT_REQUESTS=1` y usar datos ficticios. SQLite fuera del directorio público, configurable con `SENSACION_DATA_DIR`; por defecto, `sensacion-data` junto a la raíz del repositorio. No se envían notificaciones.

Panel `/admin.html`: configurar `SENSACION_ADMIN_TOKEN` de al menos 24 caracteres en el entorno del servidor, nunca en Git o URLs. Clave solo en memoria. Permite consultar solicitudes y marcar pendiente, confirmada, no disponible o cancelada. El restaurante debe comprobar disponibilidad y contactar directamente con el cliente; el cambio de estado no envía mensajes. Sin token, API administrativa denegada.

Antes de activar con clientes reales: completar privacidad, responsable y contacto para derechos, conservación/borrado, HTTPS, copias persistentes y operación de solicitudes. El servidor incluido es de desarrollo. Datos facilitados por el usuario: Amaia Kalea, 2, 48940, Bizkaia; teléfono 946 09 59 75. Horarios no confirmados, teléfono usado exclusivamente para llamadas.

## Pruebas

Desde la raíz, con las dependencias del package-lock principal instaladas:

```sh
node asador-sensacion/tests/ui.cjs
```

Playwright y Chromium (`CHROMIUM_PATH` o `/usr/bin/chromium`); verifica carta, imágenes, filtros, orden, diálogos, foco, selección, solicitud sin envío, anchos 320/390/768/1440 y movimiento reducido. Servidor y datos temporales aislados. Capturas de comprobación en `/tmp/sensacion-redesign-desktop.png` y `/tmp/sensacion-redesign-mobile.png`.
