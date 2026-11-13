/* Route only the hosted Pages demo API calls to its durable backend. */
(()=>{if(location.hostname!=='vasquezfabricio49-cmyk.github.io')return;const original=window.fetch.bind(window);const api='https://asador-sensacion-demo.vasquezfabricio49.chatgpt.site/';window.fetch=(input,options)=>original(typeof input==='string'&&input.startsWith('api/')?api+input:input,options)})();
