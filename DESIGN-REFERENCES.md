# Dirección visual y referencias

## Referencia principal

Lamasior Pastelería: `https://lamasiorpasteleria.com/`. El acceso web devolvió 403 por la política de red actual; se estudió la grabación de pantalla aportada por el usuario. Se trasladaron principios de composición —objeto central flotante, etiquetas de cristal, escalas tipográficas editoriales, continuidad cromática, tarjetas de catálogo y llamadas a la acción— a las tres marcas. No se copiaron su identidad, logotipo, fotografías, textos comerciales ni productos.

Tap & Go: crema, chocolate y oro suave; visual digital artesanal; recorrido estudio → servicios → demos → briefing. Shalom: marfil, caramelo y bronce; cuidado facial y tecnología sin aspecto de dashboard. Esthetica Latino: miel, madera y lino; rituales cálidos de bienestar. Los visuales son simbólicos y no afirman que los centros comercialicen los frascos o elementos representados.

## Repositorios consultados

Se descargaron README y licencias de las referencias accesibles; el material de consulta se conserva fuera del checkout, en `/workspace/library-files/design-references`.

| Referencia del usuario | Consulta / uso en el proyecto |
|---|---|
| `magicuidesign/magicui` | README y MIT consultados. Referencia de jerarquía, composiciones bento, bordes y profundidad. Implementación editorial propia. |
| `aceternity/ai-saas` | El enlace y las rutas README/licencia devolvieron 404. No se afirma haber usado código de un repositorio no accesible. La dirección de capas, desenfoque y profundidad se implementó de forma propia a partir del encargo visual. |
| `shadcn-ui/ui` | README, MIT y fuente de Button consultados. Variantes de botón, estados de foco, deshabilitado y consistencia adaptados al CSS local. No se instala el framework completo. |
| `nextui-org/nextui` | README y MIT consultados; el README remite a HeroUI. Referencia para componentes suaves, jerarquía de superficies y controles. |
| `framer/motion` | README y MIT consultados. Dependencia real `motion` 14.7.1; anima entrada del hero, objeto, etiquetas, revelado y progreso de scroll. Respeta movimiento reducido. |
| `TailAdmin/free-react-tailwind-admin-dashboard` | README y MIT consultados. Referencia para resumen administrativo; las métricas del panel se calculan a partir de las solicitudes reales de la demo. |
| `tabler/tabler` | README y MIT consultados. Referencia de separación entre estados, acciones y metadatos en administración. |
| `ant-design/ant-design-pro` | README de master y MIT consultados. Referencia para filtrado y estados vacíos/errores del panel. |
| `coreui/coreui-free-react-admin-template` | README y MIT consultados. Referencia para navegación y jerarquía del panel administrativo. |

No se afirma que se hayan integrado todos estos frameworks: se evita combinar runtimes y estilos incompatibles. Los componentes públicos se realizan con HTML semántico, CSS propio y la dependencia Motion. Las licencias de consulta y de los componentes adaptados se conservan en `licenses/`.

## Tipografía y multimedia

Bodoni Moda variable (normal e italic) y DM Sans variable, descargadas del repositorio público Google Fonts con sus licencias SIL OFL. Se sirven localmente. Los originales de imágenes generadas permanecen en `/workspace/generated_images`; el frontend usa versiones WebP sin añadir interfaces de redes sociales. Las previsualizaciones de proyectos son capturas de nuestras propias páginas, no capturas de Instagram ni de la referencia.

El catálogo conserva la procedencia y límites de cada entrada en `assets/catalog.json`. No se fabrican reseñas, calificaciones, tarifas, direcciones exactas ni resultados clínicos. La portada de Tap & Go permite preparar y descargar un briefing; no simula un envío de contacto a una dirección no verificada.
