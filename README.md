# Tap & Go Premium — portada, dos experiencias y agenda Shalom

## Inicio

Python 3.12 o superior, sin dependencias externas:

```sh
python3 server.py --port 3001
```

El servidor muestra la nueva portada de Tap & Go en `/`, Shalom en `/shalom-beauty-clinique/` y Esthetica Latino en `/esthetica-latino/`. Ya no se debe usar `python -m http.server` para la agenda: solo sirve los archivos y no ejecuta la API.

## Lo creado

- Portada Tap & Go con hero inmersivo, visual simbólico de marca, proyectos navegables y briefing descargable.
- Tres composiciones editoriales con transparencia, etiquetas de cristal y movimiento con Motion.
- Tipografías Bodoni Moda y DM Sans alojadas localmente; imágenes WebP optimizadas.

- 8 experiencias Shalom y 12 Esthetica Latino; filtros, fichas individuales y visuales propios sin interfaces de Instagram.
- Fotografías editoriales generadas con IA y una recreación artística del espacio de Shalom. No representan personal real, resultados ni imágenes documentales de los locales.
- Agenda Shalom persistente en SQLite: servicio, fecha, horarios, datos de contacto ficticios, consentimiento, referencia privada, consulta/cancelación, archivo de calendario y panel de administración.
- Protección de solapes entre servicios, transacciones frente a solicitudes concurrentes, reintentos idempotentes, clave privada por reserva y administración protegida.

## Demo razonada

Agenda de una cabina, 15 minutos entre sesiones, antelación de 2 horas, horizonte de 60 días. Horario de prueba: martes a viernes 10–14 y 16–20, sábado 10–14. Bloques de 30 minutos para diagnóstico, primera visita y orientación de rutina; 45 para consulta de micropigmentación; 60 para las demás experiencias. Estas son hipótesis operativas de demo, no el horario ni la duración anunciados por Shalom. Ninguna cita es real ni se envían notificaciones.

Datos fuera de la carpeta pública: por defecto `../shalom-data/appointments.sqlite3`. Para otra ubicación, definir `SHALOM_DATA_DIR`. No publicar ni añadir esta base a Git. La demo almacena nombre, email y teléfono de prueba; cancelar no borra el registro. Definir retención y privacidad antes de recopilar datos reales.

Administración: definir `SHALOM_ADMIN_TOKEN` con un valor seguro de al menos 24 caracteres en el entorno del servidor. No incluirlo en código, URL ni conversaciones. Entrar en `/shalom-beauty-clinique/admin.html`. Sin clave configurada la administración permanece deshabilitada. El token se mantiene en memoria del navegador y se elimina al cerrar sesión.

`SHALOM_AGENDA_CONFIG` permite cargar JSON con `weekly_hours` (días 0=lunes a 6=domingo), `durations` por identificador de servicio, `buffer_minutes` y `closed_dates`. El modo live exige configuración explícita y duraciones de todos los servicios; no está activado. Para producción, además de validar datos, hacen falta TLS, un frontal apto, respaldos, retención y operación de solicitudes/notificaciones.

## Fuentes

Servicios Shalom: VeraFace, Astrodome, cosmética coreana OxygenCeuticals, faciales y corporales personalizados y micropigmentación observados en grabación. Primera visita y orientación de rutina son entradas de consulta/editoriales, no técnicas adicionales inventadas. Micropigmentación reserva una consulta previa. No se infieren técnicas corporales de una fotografía de una máquina. Esthetica Latino: servicios y WhatsApp contrastados con la primera grabación. No se incluyen precios sin confirmar vigencia. `assets/catalog.json` registra la procedencia de cada ficha.

## Edición de animaciones

Las animaciones ya están compiladas en `assets/experience.js` y el contenedor de despliegue no necesita Node. Para modificarlas: `npm ci` y `npm run build`. Código fuente en `src/experience.js`; versiones y hashes fijados en `package-lock.json`. En este entorno puede usarse `npm --cache /tmp/beauty-npm-cache ci` porque el directorio personal no es escribible.

La API sigue usando Python y SQLite. El frontend servido es HTML/CSS/JS: no se ha migrado a Next.js ni se han instalado varios sistemas completos de UI a la vez. Motion es una dependencia real integrada; los demás repositorios se han consultado como referencias de componentes y patrones. Ver `DESIGN-REFERENCES.md` y `licenses/`.

## Pruebas

```sh
python3 tests/check_demo.py
npm run test:ui
```

Las pruebas de navegador usan Playwright y Chromium. En este entorno está instalado en `/usr/bin/chromium`; puede configurarse otra ruta con `CHROMIUM_PATH`. La suite usa una base temporal y datos ficticios, no modifica la agenda del usuario.

Usa una base temporal separada. Comprueba disponibilidad, persistencia, permisos, reintentos, cancelación, solapes concurrentes, consentimiento, origen, confirmación administrativa y rutas de los dos dominios.

## Subdominios Porkbun

Leer `PORKBUN-INSTRUCCIONES.md`. `Dockerfile`, `deploy_entrypoint.py` y `render.yaml` preparan un servicio con disco persistente. Son una opción de despliegue que puede tener coste y no se ha contratado ni publicado. El servidor distingue `shalom.tapandgoweb.com` y `esthetica.tapandgoweb.com` por Host. Cada dominio muestra su propia web en `/`. Añadir ambos dominios al alojamiento y configurar en Porkbun los CNAME que el alojamiento indique. No inventar destinos ni cambiar el DNS principal o de correo.

El arranque del contenedor prepara únicamente la carpeta de datos de esta aplicación en el volumen y después baja privilegios al usuario 10001. El código se copia con permisos compatibles con ese usuario.

## Publicar solo Shalom con Netlify Drop

`npm run export:shalom-netlify` genera `../shalom-netlify.zip` y `dist/shalom-netlify`. Ese ZIP se arrastra directamente a la zona de nuevo proyecto de Netlify: contiene Shalom en la raíz, fuentes y recursos locales, sin servidor Python. Para que la reserva pueda probarse en una subida estática, incluye un adaptador exclusivo de esta exportación: los datos se guardan en localStorage de ese navegador, hay control local de solapes mediante Web Locks y gestión/cancelación local. No hay disponibilidad compartida entre dispositivos, administración central ni citas reales. Todo el flujo lo indica. La aplicación Python/SQLite original no cambia ni utiliza el adaptador.

Tras publicar, añadir `shalom.tapandgoweb.com` desde la configuración de dominios del proyecto y copiar los registros que indique Netlify. El CNAME de Shalom que apuntaba a ChatGPT Site debe sustituirse por el destino real de Netlify; no cambiar los de otros proyectos.
