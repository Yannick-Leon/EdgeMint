import axios from 'axios';
import { logger } from '../logger.js';

/**
 * Placeholder: holt Quotes für ein Symbol von "Exchanges".
 * Später ersetzen wir das durch echte Adapter (Binance, Kraken, etc.).
 */
export async function fetchQuotes(symbol = 'BTCUSDT') {
  // MOCK: generiere leichte Preisunterschiede
  const base = 60000; // Basispreis (Dummy)
  const drift = Math.random() * 200 - 100;

  const quotes = [
    { exchange: 'MockBinance', symbol, bid: base + drift - 20, ask: base + drift + 20 },
    { exchange: 'MockKraken',  symbol, bid: base + drift - 10, ask: base + drift + 30 }
  ];

  logger.debug({ quotes }, 'Generated mock quotes');
  return quotes;
}

export async function listExchanges() {
  return [
    { id: 'MockBinance', type: 'mock', status: 'ok' },
    { id: 'MockKraken',  type: 'mock', status: 'ok' }
  ];
}
