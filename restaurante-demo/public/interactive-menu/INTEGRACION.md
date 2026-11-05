# Carta interactiva integrada

La página principal carga `menu.css` y llama a `mountInteractiveMenu(elemento, {imageBase: '/images/', dishes})` desde `app.js`. Los platos se cargan desde `/api/config`; la fuente única es `config.json`. La función devuelve un destructor para desmontar el componente. La vista `/interactive-menu/` consulta la misma API y necesita el servidor Python.

Incluye filtros, búsqueda, modal nativo con Escape y restitución de foco, selección local en memoria, eliminación y total orientativo. No envía pedidos ni reservas. El chuletón se estima a 52 €/kg con 1 kg por unidad seleccionada. Los precios son provisionales del diseño suministrado. La selección se pierde al recargar; no almacena información personal. La reserva se gestiona en un formulario y una API independientes.

Las imágenes generadas son ilustrativas y tienen resolución moderada. No se pudo acceder a la referencia de Awwwards: el proxy respondió 403. No se afirma reproducir su diseño ni se han copiado sus recursos.
