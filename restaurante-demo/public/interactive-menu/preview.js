import {mountInteractiveMenu} from './menu.js';
const root=document.querySelector('#interactive-menu');
try{const response=await fetch('/api/config');if(!response.ok)throw Error();const config=await response.json();mountInteractiveMenu(root,{imageBase:'/images/',dishes:config.menu.map(d=>({id:d.id,name:d.nombre,category:d.origen,price:d.precio,unit:d.unidad==='kg'?'kg':null,description:d.descripcion,pairing:d.maridaje}))});}catch{root.textContent='Arranca el servidor Python del restaurante para consultar la carta.';}
