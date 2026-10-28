# Despliegue de Tap & Go Premium y conexión de los subdominios

Paquete definitivo: `tap-and-go-premium.zip`. Incluye la portada de Tap & Go, las dos demos, el código, el bundle de Motion ya compilado, las fuentes locales, las imágenes WebP, Dockerfile y render.yaml. Extraer y subir el contenido completo al repositorio, manteniendo los directorios. Los originales PNG no son necesarios para ejecutar la web.

## Texto para pegar en la extensión de ChatGPT abierta en Porkbun

Quiero conectar dos demostraciones web a mi dominio tapandgoweb.com:

- https://shalom.tapandgoweb.com
- https://esthetica.tapandgoweb.com

No están activas todavía. Porkbun gestiona el DNS; no aloja por sí solo el servidor de reservas. No inventes una dirección de destino ni apuntes al entorno de ChatGPT, a localhost o a una IP privada.

1. Revisa los registros DNS actuales de tapandgoweb.com. Conserva los de @, www, correo, MX, SPF, DKIM y DMARC, y todos los registros ajenos a estos dos subdominios. No cambies los nameservers.
2. Necesito primero un alojamiento desplegado. El proyecto incluye Dockerfile y render.yaml para Render, con una base SQLite persistente. El código debe estar en el repositorio WEBS-de-prueba y desplegarse con ese blueprint. Si se utiliza ZIP, Render no lo importa directamente: subir primero su contenido completo al repositorio y después conectar el repositorio en Render. El plan y disco pueden tener coste: muestra el importe actual y espera mi aprobación antes de contratar nada. Si ya tengo un servidor compatible, úsalo y adapta el despliegue sin contratar otro.
3. Tras un despliegue correcto, obtén del panel del alojamiento el hostname público REAL asignado y comprueba que /healthz devuelve 200. Registra allí los dominios personalizados shalom.tapandgoweb.com y esthetica.tapandgoweb.com. El servidor ya distingue las dos webs por esos nombres.
4. En Porkbun: Domain Management → tapandgoweb.com → DNS. La interfaz puede variar. Añade los registros que indique el alojamiento. En Render normalmente serán:
   - Type: CNAME. Host: shalom. Answer: hostname real del servicio, sin https:// ni barras. TTL: valor predeterminado.
   - Type: CNAME. Host: esthetica. Answer: el mismo hostname real. TTL: valor predeterminado.
   NO copies un ejemplo terminado en onrender.com si el panel no ha asignado exactamente ese valor.
5. Si ya existe un A, AAAA o CNAME para shalom o esthetica, no lo borres ni lo sustituyas sin explicarme el conflicto y confirmar que puedo reemplazarlo. Si el alojamiento pide un TXT de verificación, usa exactamente su nombre y contenido.
6. Valida DNS y los certificados HTTPS desde el alojamiento. Abre ambas direcciones y comprueba que Shalom muestra su propia web, Esthetica la suya, las imágenes cargan y no hay errores. La propagación y emisión de certificados pueden tardar; no anuncies que están listas sin comprobarlo.
7. Mantén Shalom en modo DEMO. No actives citas reales ni publiques datos personales. Comprueba con datos ficticios una solicitud, su enlace privado de gestión, la cancelación y que no permite solapar horarios. No envía correos o WhatsApp. No muestres claves de administración en el chat.
8. Devuélveme las dos URL HTTPS verificadas y los registros que creaste. Las webs no deben incluir marcas de ChatGPT, iframes de Instagram ni controles de reels.

Si no puedes entrar al alojamiento o no tienes el código, detente solo en el paso que depende de eso y dime qué falta. Tener acceso a Porkbun no significa tener acceso al repositorio ni al hosting.

# Preparación del proyecto

Ejecutar localmente: `python3 server.py --port 3000` desde el directorio del proyecto. Python 3.12 o superior, sin paquetes externos. Por defecto es una demo con una cabina, 15 minutos de preparación, antelación mínima de 2 horas y horizonte de 60 días. Horario de prueba: martes a viernes 10–14 y 16–20, sábado 10–14. No se presenta como horario del negocio. Los bloques son 30, 45 o 60 minutos según la experiencia y son orientativos. Solicitudes y confirmaciones solo pertenecen a la demo.

La administración requiere SHALOM_ADMIN_TOKEN con al menos 24 caracteres. Render lo genera en la configuración propuesta. El operador lo consulta de forma segura en su panel; no debe incrustarlo en el HTML ni en el código. El panel se encuentra en /admin.html bajo el subdominio Shalom. La base de datos debe persistir fuera de la carpeta pública.

Antes de aceptar reservas reales hay que validar agenda, duración, capacidad, servicios, privacidad y gestión operativa; desplegar HTTPS con un servidor frontal apto para producción y definir respaldos, retención y notificaciones. Este paquete es una demo funcional, no un despliegue público completado.

## Campos exactos en Porkbun

`Tipo = CNAME`, `Anfitrión = shalom` (solo esa palabra), `TTL = 600`. El campo `Objetivo` requiere el hostname REAL que asigne Render tras el despliegue, sin https:// ni ruta. La frase «destino real que asigne el alojamiento» es una explicación y no se puede copiar como valor. Repetir para `Anfitrión = esthetica`. Si todavía no se dispone del hostname, cancelar el formulario: no hay un registro válido que crear aún.
