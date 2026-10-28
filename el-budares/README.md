# El Budare’s — Sabor sin freno

Propuesta web independiente para Bar café El Budare’s, Bilbao. Identidad oscura, burdeos y roja, titulares condensados, imágenes recortadas y superficies planas, siguiendo el documento de diseño de referencia suministrado por el usuario.

## Abrir y alojar

Esta carpeta es un sitio estático: contiene index.html, recursos locales y el bundle JavaScript compilado. Puede publicarse íntegra en un alojamiento estático. No requiere backend, pagos, base de datos ni instalación de Node para servirla. Para probar localmente desde esta carpeta: `python3 -m http.server 3000`.

La entrega adicional `el-budares.html` es una versión autónoma con CSS, fuentes, imágenes, catálogo y JavaScript incrustados. El paquete `el-budares-completo.zip` contiene esta carpeta y las fuentes de desarrollo. Ninguno de estos archivos implica que exista ya un sitio público o un enlace chatgpt.site.

## Carta y precios

38 referencias de las dos capturas aportadas: 6 cachapas, 5 hamburguesas, 4 pepitos, 3 perros calientes, 3 salchipapas, 3 platos extra, 9 empanadas, 4 pasteles y 1 desayuno criollo. Los precios legibles están transcritos; no se ha comprobado que sigan vigentes.

Los precios de huevos rotos (13 €) y pollo a la canasta (14 €) no eran legibles. A petición del usuario se completaron como importes orientativos de propuesta, marcados con asterisco en la carta, ficha y selección. No se presentan como tarifas confirmadas del local. Ingredientes y alérgenos deben confirmarse en el establecimiento o la plataforma.

## Pedidos

La selección local permite variantes, notas, cantidades, eliminación, subtotal y descarga/copia del resumen. Se guarda solo en el navegador, con un límite de 20 unidades por línea. No se envía al restaurante ni se transfiere a otras plataformas, no procesa pagos y no reserva productos.

Los botones reales abren los enlaces facilitados de Glovo y Uber Eats. El usuario debe volver a elegir los productos allí y comprobar precios finales, gastos y disponibilidad.

## Reseñas

Se incluyen seis viñetas animadas que enlazan a las referencias de Google Maps aportadas. El entorno devolvió 403 al intentar leerlas: no se transcriben citas, autores, estrellas ni nota media no verificadas. Para mostrar comentarios completos, introducir el texto real en assets/menu.json con `verifiedText: true`, `text` y `author`, conservar su `url` y volver a renderizar. No inventar opiniones.

## Multimedia y tipografías

Cinco recursos fotográficos generados con IA, dos recortes protagonistas y tres hojas de cuatro fotos para las familias de platos. Son ilustrativos: no son fotografías documentales de las raciones reales. Se emplean versiones WebP, sin interfaces de Maps/Instagram. Anton y DM Sans son fuentes locales con licencia SIL OFL; Motion es una dependencia MIT, con avisos incluidos. No se distribuyen la tipografía propietaria ni la identidad de Impossible Foods.

## Desarrollo en el repositorio completo

- Catálogo: el-budares/assets/menu.json.
- Renderizar HTML: `python3 scripts/render_budares.py`.
- Compilar interacción y animación: `npm ci && npm run build:budares`.
- Empaquetar ZIP y HTML autónomo: `python3 scripts/package_budares.py`.
- Probar navegador: `node tests/budares.spec.cjs` con Chromium en /usr/bin/chromium, configurable mediante CHROMIUM_PATH.

Se verificaron 71 comprobaciones de navegador: tamaños 320/390/768/1440, recursos locales, filtros, búsqueda, variantes, totales, notas seguras, persistencia, enlaces de pedidos y animación de las viñetas. La versión autónoma se probó con la carga externa bloqueada para comprobar que no necesita recursos adicionales.

## Publicación y dominio propio

Esta sesión no dispone de una herramienta para publicar en chatgpt.site. No se ha realizado una publicación ni generado una URL pública, un CNAME o un TXT para este sitio. Una vez publicado en un servicio elegido por el usuario, registrar allí el subdominio deseado y utilizar exclusivamente los valores DNS que emita ese servicio. Mantener intactos el dominio principal, correo y subdominios de otros negocios.
