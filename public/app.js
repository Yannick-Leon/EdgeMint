// WebSocket mit Auto-Reconnect (Exponential Backoff)
function createWS(onMsg) {
  const WS_URL =
    (location.protocol === 'https:' ? 'wss://' : 'ws://') +
    location.host +
    '/ws';

  let ws;
  let tries = 0;
  let timer;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      tries = 0;
      log('✅ Verbunden mit ' + WS_URL);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        onMsg?.(msg);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      const delay = Math.min(30000, 1000 * 2 ** tries); // bis 30s
      tries++;
      log('🔌 Verbindung verloren, versuche Reconnect in ' + Math.round(delay/1000) + 's…');
      clearTimeout(timer);
      timer = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // Fehler wird meist auch als close folgen
    };
  }

  connect();
  return () => { clearTimeout(timer); ws?.close(); };
}

function log(msg) {
  const el = document.getElementById('log');
  if (!el) return;
  const ts = new Date().toLocaleTimeString();
  el.textContent = `${ts}\n${msg}\n` + el.textContent;
}

// Beispiel: WS starten
createWS((msg) => {
  if (msg.type === 'hello') log('👋 ' + JSON.stringify(msg));
  if (msg.type === 'heartbeat') log('💓 heartbeat');
  if (msg.type === 'bot') log(`🤖 Bot: ${msg.status}`);
});

// Bot-Start per API
async function startBot() {
  try {
    const res = await fetch('/api/bot/start', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.message || res.statusText);
    }
    log('🚀 Bot-Start ok');
  } catch (err) {
    log('❌ Bot-Start fehlgeschlagen: ' + (err?.message || String(err)));
  }
}

// Bot-Stop per API
async function stopBot() {
  try {
    const res = await fetch('/api/bot/stop', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.message || res.statusText);
    }
    log('🚀 Bot-Stop ok');
  } catch (err) {
    log('❌ Bot-Stop fehlgeschlagen: ' + (err?.message || String(err)));
  }
}

// Buttons im Dashboard anbinden:
document.getElementById('btnStart')?.addEventListener('click', startBot);
document.getElementById('btnStop')?.addEventListener('click', stopBot);
