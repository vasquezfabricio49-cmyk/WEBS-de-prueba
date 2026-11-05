# Fuego, Valle y Altiplano — restaurante demo

Web independiente de cocina vasca y boliviana. Mantiene intactas las otras webs del repositorio. El nombre es de trabajo; platos, precios, maridajes, horarios y aforo proceden de una propuesta, no de una carta comercial confirmada.

## Abrir en Codespaces o VS Code

Desde la raíz de WEBS-de-prueba:

```sh
python3 restaurante-demo/server.py --host 0.0.0.0 --port 3002
```

Python 3.12+ con SQLite y zona horaria Europe/Madrid. La aplicación no necesita instalar dependencias ni compilar para arrancar. También puedes abrir `restaurante-demo.code-workspace` y ejecutar la tarea **Restaurante: arrancar**.

En Codespaces, abre **Puertos → 3002 → Abrir en el navegador**. Mantén el puerto privado para desarrollo. El enlace funciona mientras el Codespace está activo; esto no es alojamiento permanente. Subir el código a GitHub no despliega un servidor ni publica en ChatGPT Site.

No uses `python -m http.server` para la aplicación: no ejecuta la API de reservas. El servidor original de la raíz sigue sirviendo las otras webs; este proyecto tiene su propio servidor y puerto.

## Qué incluye

- Portada fotográfica, navegación móvil y secciones de historia, galería y contacto.
- Carta centralizada en `config.json`, filtros, búsqueda, detalles y selección con total orientativo. La selección permanece en memoria; no es un pedido ni se envía al restaurante.
- Ocho WebP generados con IA, separados, con textos alternativos y nota de imagen ilustrativa. No representan el local ni platos reales. Resolución aproximada 623 × 316 píxeles; los recortes de portada son deliberadamente atmosféricos.
- Reservas **solo demo**: disponibilidad según fecha y personas, control de aforo concurrente, margen entre turnos, persistencia SQLite, reintentos idempotentes y consulta/cancelación con clave privada.
- Justificante descargable, sin envío de emails ni notificaciones ficticias.
- Administración protegida y pruebas automáticas de API y navegador.
- Modales con teclado, restitución de foco, estados accesibles y respeto al movimiento reducido.

## Editar carta y contacto

`config.json` es la fuente que usa la web para platos, precios, contacto y reglas demo. Reinicia el servidor después de editarlo. `carta-provisional.json` queda únicamente como documento de procedencia del diseño original; la aplicación no lo consulta.

Precios provisionales: chuletón 52 €/kg; silpancho 22 €; kokotxas 28 €; cuñapé 8 €. En la selección, una unidad de chuletón representa 1 kg estimado; el precio real dependería del peso. No se han inventado alérgenos: deben verificarse junto con la composición.

Rellena `restaurant.address`, `phone`, `email` y `mapUrl` únicamente con datos confirmados. El mapa requiere un enlace HTTPS. No se activan enlaces vacíos ni se muestra una ubicación inventada.

Los horarios de `weeklyHours` usan 0=lunes, 6=domingo. Aforo inicial 12 personas, grupos de hasta 8, duración 120 minutos, margen 15, franjas cada 30 minutos, antelación mínima 2 horas y horizonte 60 días. Son hipótesis de demo. No activar para clientes reales: el servidor rechaza `demo: false`.

## Datos y administración

La base se crea por defecto fuera del checkout, en `../restaurante-data/` respecto de la raíz del repositorio. Puedes configurar `RESTAURANT_DATA_DIR` con una ruta fuera de `public`. Nunca añadas la base a Git. La cancelación no elimina el registro. Usa datos ficticios.

Para habilitar `/admin.html`, configura `RESTAURANT_ADMIN_TOKEN` con un valor seguro de al menos 24 caracteres en el entorno del proceso. No lo incluyas en Git ni en URLs. El formulario no lo persiste en el navegador y borra el campo tras consultar. Sin token, la API administrativa devuelve 401.

## Validación

Desde la raíz del repositorio, las pruebas de navegador usan el Playwright fijado en el package-lock.json principal y Chromium:

```sh
npm --cache /tmp/beauty-npm-cache ci
npm --prefix restaurante-demo run build
npm --prefix restaurante-demo run test:api
npm --prefix restaurante-demo run test:ui
```

Si Chromium no está en `/usr/bin/chromium`, configura `CHROMIUM_PATH` con el ejecutable instalado. Se pueden instalar el navegador y sus bibliotecas mediante los comandos oficiales de Playwright; no desactives comprobaciones TLS. Las pruebas usan bases y puertos temporales. El test API reinicia el servidor para comprobar persistencia y fuerza una carrera de aforo. El test UI prueba 320, 390, 768 y 1440 píxeles con y sin movimiento reducido, imágenes, selección, reserva, justificante, cancelación y administración.

La compilación verifica los módulos: los archivos ya son JavaScript nativo y no requieren bundler. No se utilizan CDNs ni se necesitan llamadas externas para mostrar la web.

## Límites de esta entrega

No hay despliegue público, cambio DNS ni publicación en ChatGPT Site. Para aceptar reservas reales hacen falta datos comerciales validados, política de privacidad, almacenamiento y copias persistentes, un servidor de producción con TLS y la operación de reservas/notificaciones. El diseño es una propuesta propia; la referencia de Awwwards no pudo consultarse porque el proxy devolvió 403.
