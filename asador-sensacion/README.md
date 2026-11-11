# Asador Sensación · Bolivia en cada bocado

Web independiente con rojo, amarillo, verde y tonos tierra, referencias textiles andinas, tipografía contundente y una escena gastronómica interactiva en la apertura. La portada anterior basada en la captura oscura se ha sustituido. La referencia solicitada es tacosmyguey.com, pero su acceso sigue denegado por la política de red; no se afirma que esta versión sea una reproducción verificada de esa web. Se han guardado los dominios tacosmyguey.com y www.tacosmyguey.com en el borrador del entorno, pendientes de que el usuario guarde y aplique el acceso.

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

Imágenes nuevas generadas con IA: **36 fotografías ilustrativas individuales**, cada una con al menos 1024 píxeles de ancho, en un mismo formato de plato oscuro sobre fondo crema. Se elimina la lámina anterior y sus celdas de baja resolución. Los WebP se cargan de forma diferida, con dimensiones declaradas para evitar saltos. Los PNG originales de generación permanecen fuera del checkout en el entorno; los WebP se han codificado con ffmpeg sin cambiar la composición. Son representaciones artísticas, no fotografías de platos reales ni documentación exacta de recetas. Las fotos originales del chat no se presentan como si fueran estas imágenes. Fuentes locales Anton y DM Sans, con licencias adjuntas. Las fuentes editoriales antiguas se conservan como recursos previos, pero ya no se usan.

La apertura utiliza un pique macho y un aderezo generados con fondo transparente, sombras, capas CSS 3D, iluminación que sigue al cursor y una llegada escalonada del plato y los elementos de primer plano. Tres botones permiten cambiar el plato destacado; la transición espera a que la imagen esté decodificada. El botón de repetición vuelve a ejecutar la entrada. No se captura el scroll ni se impide actuar durante la animación. Se desactivan profundidad y animaciones con movimiento reducido; se cancelan actualizaciones al salir de la escena o al ocultarse la pestaña. La carta y las reservas funcionan sin estos efectos, implementados en experience.js sin dependencias adicionales.

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

Playwright y Chromium (`CHROMIUM_PATH` o `/usr/bin/chromium`); 200 comprobaciones: verifica carta, disponibilidad de las 36 imágenes individuales, resolución, filtros, orden, cambio de platos de la portada, profundidad al mover el cursor, reinicio de la entrada, diálogos, foco, selección, solicitud sin envío, anchos 320/390/768/1440 y movimiento reducido. Servidor y datos temporales aislados. Capturas de comprobación en `/tmp/sensacion-redesign-desktop.png` y `/tmp/sensacion-redesign-mobile.png`.

## Identidad boliviana

Paleta de rojo, amarillo y verde con tonos tierra y un patrón SVG original inspirado en los tejidos andinos (no una pieza artesanal ni una reproducción de un tejido específico). La apertura incorpora esa referencia textil. El recorrido por Altiplano, Valles y Oriente permite abrir fichas de platos asociados a cada región; las asociaciones no se presentan como orígenes exclusivos ni representan todas las cocinas del país. Las tres ilustraciones de paisaje son gráficas decorativas. Se mantienen las imágenes IA, los precios propuestos y las solicitudes pendientes de confirmación.

## Compra ficticia

Carrito con cantidades, total y checkout local en `checkout.js`. Métodos: tarjeta ficticia de solo lectura, Apple Pay simulado y Google Pay simulado; no se usa una pasarela, un SDK ni la API de carteras. Consentimiento explícito de demostración, estado de proceso, rechazo de prueba con reintento y justificante descargable DEMO. El total se calcula en céntimos. No se aceptan datos bancarios reales, no se transmiten datos de pago ni se crean pedidos para el restaurante. Cancelar o rechazar conserva el carrito; completar la simulación lo vacía. No requiere claves ni servicios externos. Los pagos reales quedan fuera de esta implementación.

Identidad ampliada con una ilustración SVG original de paisaje y ciudad en ladera inspirada en Bolivia, tejidos más presentes y los nueve departamentos en la franja animada. Se eliminan los asteriscos decorativos.
