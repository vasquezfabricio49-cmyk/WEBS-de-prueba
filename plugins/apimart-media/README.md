# APIMart Media para Codex

Plugin personal con manifiesto de Codex, skill en español y conexión al **MCP remoto oficial de APIMart**. No necesita un servidor ni dependencias locales adicionales. Permite usar los modelos de imagen y vídeo que estén disponibles para tu clave, consultar documentación/esquema y seguir tareas asíncronas. No promete compatibilidad con proveedores ajenos a APIMart ni permisos de modelos que la cuenta no tenga.

## Conectar

La configuración de plugin es `.codex-plugin/plugin.json` y `.mcp.json`. El marketplace del repositorio está en `.agents/plugins/marketplace.json`. La instalación del marketplace depende de la versión de Codex; guardar estos ficheros en Git no instala ni activa un plugin en una conversación existente.

Alternativa de conexión documentada por APIMart, desde un terminal con Codex instalado:

```sh
codex mcp add apimart --url https://mcp.apimart.ai/mcp --bearer-token-env-var APIMART_API_KEY
```

También se incluye `codex-mcp.toml` para fusionar con la configuración del cliente. No reemplaces el fichero completo ni dupliques una sección existente. Reinicia el cliente o inicia una nueva tarea para cargar el servidor.

Configura `APIMART_API_KEY` en los secretos del entorno o en el almacén seguro del cliente. No pongas valores reales en archivos del proyecto, Git, la URL o el chat. Si una clave se ha compartido en una conversación, revócala y crea otra. Ningún fichero de este plugin incluye la clave compartida.

## Red y credenciales del entorno en la nube

Se han guardado los requisitos en el borrador del entorno, pero no se han aplicado ni publicado: `api.apimart.ai`, `docs.apimart.ai` y `mcp.apimart.ai`. Conserva otros dominios de tu configuración. La clave debe estar disponible como `APIMART_API_KEY`. El requisito de secreto ya existente permite api.apimart.ai; para usar el MCP remoto debes editarlo en los ajustes y añadir mcp.apimart.ai. La ampliación automática de sus destinos fue rechazada por conflicto de configuración y no se ha creado ningún secreto duplicado. En este entorno el proxy necesita permiso para enviarla a los destinos API y MCP. Revisa y guarda los ajustes y publica el entorno cuando la interfaz lo permita. Después verifica una conexión nueva.

## Herramientas del servicio

- `list_models`: modelos disponibles para la cuenta.
- `get_model_docs`: documentación actual por modelo.
- `get_model_schema`: operación y parámetros compatibles.
- `upload_image`: imágenes de referencia.
- `generate_image` / `generate_video`: generación solicitada.
- `get_task`: estado y resultado de tareas asíncronas.

Los parámetros y la compatibilidad no están fijados en el plugin: se consultan en el servicio antes de generar. Las peticiones pueden consumir saldo. La skill conserva claves de idempotencia para evitar duplicados y devuelve únicamente URLs reales. Según el contrato consultado, las URLs de medios caducan a las 72 horas.

## Galletas 3D

`requests/galletas-3d.json` prepara el encargo del usuario: GPT Image 2 Official, formato 16:9, calidad medium y diseño ecommerce de galletas 3D. No es una respuesta de API ni una imagen generada. Faltan verificar el ID del modelo, el esquema actual y la autenticación en vivo. No hay enlace de descarga hasta completar la generación.

## Fuentes consultadas y validación

Formato de plugin basado en los ejemplos de `https://github.com/openai/plugins` (`plugins/creative-production` y marketplace). Contrato y conexión MCP consultados en `https://github.com/apimart-ai/apimart-skills`, en `references/api-contract.md` y `docs/mcp-integration-guide.zh-CN.md`.

La URL original `https://docs.apimart.ai/es` y la API no estaban accesibles por la política de red durante esta implementación. Se verifican localmente los manifiestos, rutas y briefing con:

```sh
python3 -m unittest discover -s plugins/apimart-media/tests -v
```

Estas pruebas no equivalen a autenticación, conexión MCP, permisos de un modelo ni generación real. El plugin no está publicado en un marketplace público ni cargado como herramienta en esta conversación.

Versiones de referencia consultadas: APIMart `b9737b04c0458d005897df3be5d00b2e70e61a68`; ejemplos de plugins Codex `d420d13051bffe4543ed39e30fa46b87148e47dd`.
