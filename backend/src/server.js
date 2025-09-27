// --- Imports ---
import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// --- __dirname / __filename für ES-Module ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Env-Parsing ---
const Env = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_PRETTY: z.string().optional()
});
const env = Env.parse(process.env);
const isDev = env.NODE_ENV === 'development';

// --- Logger ---
const transport = env.LOG_PRETTY && isDev
  ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } }
  : undefined;
const logger = pino(
  { level: isDev ? 'debug' : 'info' },
  transport ? pino.transport(transport) : undefined
);

// --- Express / HTTP ---
const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN }));
app.use(express.json());

// --- Static Files (/public) ---
const publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(200).json({ message: 'API is running. No index.html found in /public.' });
    }
  });
});

// --- Health ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', now: new Date().toISOString(), uptime: process.uptime() });
});

// --- Mock Quotes ---
function mockQuotes(symbol = 'BTCUSDT') {
  const base = 60000;
  const drift = Math.random() * 200 - 100;
  return [
    { exchange: 'MockBinance', symbol, bid: base + drift - 20, ask: base + drift + 20 },
    { exchange: 'MockKraken', symbol, bid: base + drift - 10, ask: base + drift + 30 }
  ];
}

app.get('/api/quotes', (req, res) => {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const quotes = mockQuotes(symbol);
  res.json({ symbol, quotes });
});

// --- Simple Arbitrage Scan ---
app.get('/api/arbitrage/scan', (req, res) => {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const notional = Number(req.query.notional || 1000);
  const quotes = mockQuotes(symbol);

  const opps = [];
  for (let i = 0; i < quotes.length; i++) {
    for (let j = 0; j < quotes.length; j++) {
      if (i === j) continue;
      const buy = quotes[i];
      const sell = quotes[j];
      const spread = sell.bid - buy.ask;
      if (spread > 0) {
        const spreadPct = spread / buy.ask;
        opps.push({
          symbol,
          buyOn: buy.exchange,
          sellOn: sell.exchange,
          buyAsk: buy.ask,
          sellBid: sell.bid,
          spread,
          spreadPct,
          notional,
          estProfit: notional * spreadPct
        });
      }
    }
  }
  opps.sort((a, b) => b.estProfit - a.estProfit);
  res.json({ symbol, notional, opportunities: opps });
});

// --- Bot-Routen (Mock) ---
let botRunning = false;

app.post('/api/bot/start', (_req, res) => {
  if (botRunning) return res.json({ ok: true, message: 'already running' });
  botRunning = true;
  broadcast({ type: 'bot', status: 'started', ts: Date.now() });
  res.json({ ok: true });
});

app.post('/api/bot/stop', (_req, res) => {
  if (!botRunning) return res.json({ ok: true, message: 'already stopped' });
  botRunning = false;
  broadcast({ type: 'bot', status: 'stopped', ts: Date.now() });
  res.json({ ok: true });
});

app.get('/api/bot/status', (_req, res) => {
  res.json({ running: botRunning });
});

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));

// --- Error Handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- WebSocket Setup ---
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  logger.info('WS client connected');
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));

  const t = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
    }
  }, 5000);

  ws.on('close', () => {
    clearInterval(t);
    clients.delete(ws);
  });
});

// --- Start ---
server.listen(env.PORT, () => {
  logger.info(`EdgeMint listening on :${env.PORT} (${env.NODE_ENV})`);
});

// --- Graceful Shutdown ---
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    logger.info({ sig }, 'Shutting down…');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
