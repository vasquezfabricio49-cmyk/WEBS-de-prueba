# Carta interactiva

Vista independiente: servir public con el servidor existente y abrir /interactive-menu/. No sustituye ni modifica la API de reservas.

Integrar en la página existente cargando menu.css y llamando a mountInteractiveMenu(elemento, {imageBase:'/images/'}), exportada por menu.js. El argumento imageBase debe apuntar a la ruta pública real de las imágenes. La función devuelve un destructor para desmontar el componente. Mantener intactos los formularios y eventos de reservas.

Incluye filtros, búsqueda, modal nativo accesible con Escape y restitución de foco, selección local en memoria, eliminación y total orientativo. No envía pedidos ni reservas. El chuletón se estima a 52 €/kg con 1 kg por unidad seleccionada. Los precios son provisionales del diseño suministrado, no tarifas verificadas. La selección se pierde al recargar deliberadamente; no se almacena información personal.

Antes de integrar, centralizar los cuatro platos con el esquema real de config.json; este módulo trae una colección provisional independiente porque los archivos de la aplicación del Codespace no estaban publicados en GitHub. No mantener dos fuentes de precios tras la integración. Las imágenes generadas son ilustrativas y de resolución moderada; usar las fuentes originales para futuras versiones de mayor resolución.

No se pudo acceder a la referencia de Awwwards (el proxy respondió 403). No se afirma reproducir su diseño. La propuesta usa fotografía gastronómica, tipografía grande, filtros y movimiento moderado sin copiar marcas o recursos de terceros.
