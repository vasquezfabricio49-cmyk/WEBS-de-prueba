# Asador Sensación

Web de restaurante con diseño oscuro, carta editable y panel de demostración adaptable a móvil.

## Ejecutar

`python asador-sensacion/server.py --host 127.0.0.1 --port 3004`

Web: http://127.0.0.1:3004/ — Panel: http://127.0.0.1:3004/editor.html

## Edición y guardado

El panel permite añadir, editar y borrar platos, sustituir sus fotografías y ocultarlos con un interruptor ON/OFF. También permite editar los textos principales, teléfono y foto de raíces; exportar e importar la configuración; y mostrar clientes y reservas ficticios para una presentación.

La carta y los textos se guardan en `SENSACION_DATA_DIR/site-editor.json`, fuera del directorio público. La web consulta ese estado cada 1,2 segundos y refleja los cambios sin recargar. La escritura está limitada a peticiones del mismo origen desde localhost; este panel de presentación no es un CMS autenticado para producción. Los clientes y reservas de ejemplo permanecen en el navegador y no se incluyen en la carta pública. El panel protegido original `admin.html` se conserva para las solicitudes reales del servidor.

## Diseño y fotografías

Textos y controles adaptados a pantallas de 320, 390 y 430 píxeles. Carta de una columna en los dispositivos más estrechos. Formularios con texto de 16 px y controles táctiles. Bandera estatal con escudo y mapa de Google con bordes redondos. Galería repetida retirada.

Paisajes reales con el nombre del lugar: La Paz y el Illimani; Laguna Colorada, Potosí; Valle de Concepción, Tarija; río Yacuma, Beni. Autores, fuentes y licencia CC BY-SA 4.0 en `creditos.html`. Se utilizan versiones de 1280 px para reducir la descarga.

La imagen `images/pique-film-poster.png` se generó con la herramienta integrada: fotografía culinaria de pique macho con patatas gruesas, res, salchichas, tomate, cebolla roja, huevo y pimiento dulce rojo y verde; fondo carbón, luz cálida, sin limón ni guindillas. Es una ilustración, no una foto del restaurante. La animación experimental de ingredientes se retiró tras la revisión del usuario. El vídeo 4K todavía no está generado ni integrado.

## Comprobaciones

Sintaxis de JavaScript y Python. Revisión visual móvil y de controles. Verificados en dos vistas abiertas sin recarga: apagar y reactivar un plato, añadir un plato temporal, cambiar su nombre y precio y borrarlo. El plato de comprobación se eliminó. En la revisión anterior se comprobaron buscador, filtros, carrito, pago ficticio y solicitud descargable. No se afirma ejecutar las pruebas vacías del repositorio ni emular movimiento reducido; la alternativa de movimiento reducido se conserva en el código.

## Alcance de la demo

Los platos, precios e ingredientes requieren validación del restaurante. Tarjeta, Apple Pay y Google Pay son simulados: no cobran ni envían pedidos. Las solicitudes no confirman una reserva ni envían notificaciones. Para activar el registro de solicitudes, configurar `SENSACION_ACCEPT_REQUESTS=1`; la administración original requiere `SENSACION_ADMIN_TOKEN`. Antes de publicar se necesita autenticación, controles de acceso y almacenamiento privado adecuados para datos reales de clientes. Ninguna clave ni base de datos se incluye en Git.

## Reservas conectadas

Iniciar con la variable SENSACION_ACCEPT_REQUESTS=1 para registrar solicitudes. En la sesión local está activada. Cada envío se guarda en SQLite y aparece en Reservas del panel; Clientes se construye a partir de los nombres y teléfonos de esas solicitudes. La gestión local usa un encabezado del editor y se limita a localhost; el acceso remoto continúa requiriendo token. No hay confirmaciones automáticas ni mensajes. No se incluyen registros de clientes en Git.
