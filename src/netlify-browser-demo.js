/* Static-export adapter only. Never included by the Python/SQLite application. */
'use strict';
(() => {
  const realFetch = window.fetch.bind(window);
  const storageKey = 'shalom-local-demo-v1';
  const zone = 'Europe/Madrid';
  const buffer = 15;
  const hours = { 1: [['10:00', '14:00'], ['16:00', '20:00']], 2: [['10:00', '14:00'], ['16:00', '20:00']], 3: [['10:00', '14:00'], ['16:00', '20:00']], 4: [['10:00', '14:00'], ['16:00', '20:00']], 5: [['10:00', '14:00']] };
  let catalog;
  const services = () => catalog ??= realFetch('/assets/catalog.json').then(response => response.json()).then(data => new Map(data.shalom.map(service => [service.id, service])));
  const response = (status, value) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const error = (status, message) => response(status, { error: message });
  const isoDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).reduce((value, part) => ({ ...value, [part.type]: part.value }), {});
  const today = () => { const p = isoDate(new Date()); return `${p.year}-${p.month}-${p.day}`; };
  const addDays = (day, count) => { const date = new Date(day + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); };
  const validDay = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day + 'T12:00:00Z')) && day >= today() && day <= addDays(today(), 60);
  const epoch = (day, time) => {
    const offset = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(new Date(day + 'T12:00:00Z')).find(part => part.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
    return Date.parse(`${day}T${time}:00${offset}`) / 1000;
  };
  function candidates(day, service) {
    const weekday = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const slots = [];
    for (const [opening, closing] of hours[weekday] || []) {
      const [hour, minute] = opening.split(':').map(Number);
      for (let value = hour * 60 + minute; ; value += 30) {
        const clock = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
        const start = epoch(day, clock);
        if (start + (service.duration + buffer) * 60 > epoch(day, closing)) break;
        if (start > Date.now() / 1000 + 7200) slots.push({ time: clock, start });
      }
    }
    return slots;
  }
  const read = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const save = rows => localStorage.setItem(storageKey, JSON.stringify(rows));
  const write = fn => navigator.locks ? navigator.locks.request(storageKey, { mode: 'exclusive' }, fn) : Promise.resolve().then(fn);
  const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(value => value.toString(16).padStart(2, '0')).join('');
  const publicRow = row => { const { tokenHash, idempotency, signature, ...rest } = row; return rest; };
  const overlap = (rows, start, end) => rows.some(row => ['pending', 'confirmed'].includes(row.status) && row.start < end && row.start + (row.duration + buffer) * 60 > start);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, options);
    try {
      const list = await services();
      const method = (options.method || 'GET').toUpperCase();
      if (url.pathname === '/api/config') return response(200, { mode: 'demo', localOnly: true, timezone: zone, today: today(), maxDate: addDays(today(), 60), adminEnabled: false, services: [...list.values()].map(({ id, name, duration }) => ({ id, name, duration })) });
      if (url.pathname === '/api/availability') {
        const service = list.get(url.searchParams.get('service'));
        const day = url.searchParams.get('date');
        if (!service || !validDay(day)) return error(400, 'Revisa el servicio y la fecha.');
        const rows = read();
        return response(200, { mode: 'demo', localOnly: true, timezone: zone, slots: candidates(day, service).filter(slot => !overlap(rows, slot.start, slot.start + (service.duration + buffer) * 60)) });
      }
      if (url.pathname === '/api/bookings' && method === 'POST') {
        const data = JSON.parse(options.body);
        const service = list.get(data.service);
        if (!service || !validDay(data.date) || data.consent !== true || typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 80 || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.phone !== 'string' || !/^[+0-9 ()-]{7,25}$/.test(data.phone) || !/^[a-f0-9]{64}$/.test(data.managementKey) || !/^[a-zA-Z0-9-]{16,80}$/.test(data.idempotency)) return error(400, 'Revisa tus datos y acepta la información de privacidad de esta demo.');
        const slot = candidates(data.date, service).find(slot => slot.time === data.time);
        if (!slot) return error(409, 'Ese horario no está disponible.');
        const tokenHash = await hash(data.managementKey);
        const signature = JSON.stringify([data.service, data.date, data.time, data.name, data.email, data.phone]);
        return await write(() => {
          const rows = read();
          const existing = rows.find(row => row.idempotency === data.idempotency);
          if (existing) return existing.tokenHash === tokenHash && existing.signature === signature ? response(200, { ...publicRow(existing), managementKey: data.managementKey }) : error(409, 'Los datos cambiaron. Inicia otra solicitud.');
          if (overlap(rows, slot.start, slot.start + (service.duration + buffer) * 60)) return error(409, 'Ese horario acaba de ocuparse en esta demo. Elige otro.');
          const id = 'SH-' + [...crypto.getRandomValues(new Uint8Array(5))].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
          const row = { id, service: service.id, serviceName: service.name, date: data.date, time: data.time, start: slot.start, duration: service.duration, status: 'pending', mode: 'demo', localOnly: true, name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), timezone: zone, idempotency: data.idempotency, tokenHash, signature };
          rows.push(row); save(rows);
          return response(201, { ...publicRow(row), managementKey: data.managementKey });
        });
      }
      const match = url.pathname.match(/^\/api\/bookings\/(SH-[A-F0-9]+)(\/cancel)?$/);
      if (match) {
        const token = new Headers(options.headers).get('Authorization')?.replace(/^Bearer /, '') || '';
        const tokenHash = await hash(token);
        return await write(() => {
          const rows = read();
          const row = rows.find(row => row.id === match[1] && row.tokenHash === tokenHash);
          if (!row) return error(404, 'Esta solicitud solo está disponible en el navegador donde la creaste.');
          if (method === 'POST' && match[2]) {
            if (row.start <= Date.now() / 1000) return error(409, 'No se puede cancelar una solicitud pasada.');
            row.status = 'cancelled'; save(rows); return response(200, { status: 'cancelled' });
          }
          return method === 'GET' && !match[2] ? response(200, publicRow(row)) : error(405, 'Acción no disponible.');
        });
      }
      return error(404, 'Esta versión es una demo local; no dispone de administración compartida.');
    } catch {
      return error(503, 'No se puede guardar la demo en este navegador. Comprueba que permita almacenamiento local e inténtalo de nuevo.');
    }
  };
})();
