# Restaurante El Amanecer

Versión independiente del restaurante, basada en el diseño editorial anterior y publicada como archivos estáticos en GitHub Pages. No modifica Asador Sensación. Fondo oscuro, terracota y dorado derivados del logotipo original; fuentes locales y adaptación a móvil.

## Contenido y fotografías

El material del restaurante documenta cocina boliviana, menú del día, platos a la carta, karaoke, cumpleaños, bodas, encuentros familiares y celebraciones culturales. Las fechas históricas de los carteles no se presentan como próximos eventos ni recurrencias confirmadas.

El logotipo se usa sin redibujarlo. Las fotos de comida conservan ingredientes, cantidades, vajilla, disposición y ángulo; únicamente se ajustan fondo y luz. Los vídeos y las fotografías de eventos son reales. Las fotos de carta y detalle se muestran completas en 16:9 mediante object-fit:contain.

La carta publicada se carga de catalog.json. Los nombres inciertos son descriptivos, los precios no confirmados son null y se muestran como Consultar. La selección prepara una consulta de disponibilidad por WhatsApp, sin pagos ni pedidos automáticos.

Las exportaciones 4K de downloads/fotos-amanecer-4k.zip están reescaladas a 3840×2160. Esa resolución de salida no equivale a detalle nativo 4K en los originales de WhatsApp.

## Demo local, únicamente GitHub

No hay API remota, servidor de aplicación ni base de datos compartida. Solo se solicitan archivos estáticos del mismo sitio. El formulario y el editor funcionan con el almacenamiento local del navegador:

- amanecer-editor-v1 guarda carta, textos y fotos de la configuración.
- amanecer-reservations-v1 guarda solicitudes de prueba.
- La web y el editor comparten esos cambios entre pestañas del mismo navegador, dispositivo y origen web. No se comparten con otros móviles ni perfiles.
- La carta local tiene prioridad sobre catalog.json. Sin copia local se utiliza la versión publicada.
- El formulario guarda una solicitud local y ofrece un enlace de WhatsApp con un borrador. La persona decide si abre WhatsApp y envía el mensaje. El restaurante debe confirmar disponibilidad.
- Reservas muestra las solicitudes locales y permite cambiar su estado de prueba. Clientes agrupa las personas de esas solicitudes por teléfono.
- Borrar los datos del sitio en el navegador elimina la configuración y las solicitudes locales.

Usa datos ficticios. Esta demostración no sustituye un panel privado ni una gestión de reservas compartida.

## Editor y publicación global

editor.html permite añadir, editar, borrar y activar/desactivar platos; cambiar sus fotos; editar textos y la foto de raíces. Guardar aplica los cambios solo en este navegador. Exportar configuración local descarga una copia con version,menu,content y no incluye las solicitudes. Importar acepta esa copia o una carta JSON.

Para publicar cambios de la carta para todos los visitantes:

1. Pulsa Descargar carta para GitHub. Obtendrás catalog.json, con sus fotos subidas incluidas como datos de imagen.
2. Sustituye el archivo el-amanecer/catalog.json en el repositorio WEBS-de-prueba.
3. Publica el cambio en GitHub. Los visitantes sin una copia local cargarán esa carta.

La exportación de configuración sirve como copia local. Para publicar textos o diseño hay que actualizar también los archivos HTML/CSS correspondientes en el repositorio.

## Contactos transcritos

Restaurante El Amanecer, desde 2020. Av. Amaia 2, Leioa/Lejona, cerca del metro Areeta. Principal utilizado: 946095975. Móviles: 667006212 y 695465851.

Algunos carteles escriben 945095975; se conserva como discrepancia pendiente de validar. No se infieren horarios, aforo ni precios a partir de las fotografías históricas.

## Archivos

index.html y amanecer.css contienen diseño y contenido. app.js gestiona carta, selección y solicitud local. experience.js añade movimiento suave y cambio de foto de portada. cms.js gestiona configuración y solicitudes locales; editor.js y reservations-panel.js presentan el panel.

Se verifica la sintaxis JavaScript, los contratos de almacenamiento local y los enlaces estáticos. La revisión visual se realiza en el flujo principal con las imágenes finales.
