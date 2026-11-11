# Asador Sensación

Proyecto independiente. Carta y precios propuestos; nombres y composición de platos deben validarse. Datos de contacto facilitados por el usuario: Amaia Kalea, 2, 48940, Bizkaia; 946 09 59 75. No se ha verificado Maps ni la referencia tacosmyguey.com porque el proxy denegó ambos dominios. El teléfono se usa solo para llamadas.

## Inicio

Desde la raíz del repositorio:

```sh
python3 asador-sensacion/server.py --host 0.0.0.0 --port 3003
```

Python 3.12+, sin paquetes externos. Modo predeterminado: preparar y descargar solicitud, llamar para comunicarla; no se envía ni confirma una reserva. Funciona también como web estática en GitHub Pages en `/asador-sensacion/` si el repositorio ya publica su raíz. Subir a GitHub no configura Pages ni despliega Python.

## Registro compartido opcional

Para pruebas con datos ficticios, arrancar con `SENSACION_ACCEPT_REQUESTS=1`. Guarda solicitudes **pendientes**, nunca confirma automáticamente ni afirma tener disponibilidad. Datos fuera del directorio público: `/workspace/sensacion-data` en este entorno, configurable con `SENSACION_DATA_DIR`.

Consulta restringida: `GET /api/reservations` con cabecera `Authorization: Bearer <SENSACION_ADMIN_TOKEN>`. Configurar el token en el entorno del servidor con al menos 24 caracteres; no escribirlo en Git, URL o chat. Sin token, acceso denegado. Panel administrativo en `/admin.html`: clave solo en memoria, consulta y cambio de estado. No se envían notificaciones. El restaurante debe llamar para confirmar. Antes de activar con clientes reales: completar privacidad, conservación/borrado, HTTPS, backups, operación y seguimiento de solicitudes; el servidor de desarrollo no es un despliegue de producción.

## Fotografías

Las cuatro imágenes estaban visibles en el chat pero no disponibles como archivos locales. No se han sustituido por imágenes ajenas. La web carga automáticamente `images/pollo.jpg`, `images/plato.jpg` y `images/saltenas.jpg` cuando se incorporen los originales. `images/servicio.jpg` queda previsto para la cuarta fotografía de varios platos. Las tarjetas usan mientras tanto una ilustración explícita. No se han inferido rellenos, alérgenos ni recetas definitivas.

## Validación

`node --check asador-sensacion/app.js`. Comprobar en navegador filtros, búsqueda, suma y retirada de platos, validación de fecha, descarga y el estado pendiente. El servidor rechaza fechas pasadas, consentimiento ausente, origen ajeno y cuerpos grandes; evita duplicados de teléfono/fecha/hora. Todas las propuestas se editan en `app.js`.
