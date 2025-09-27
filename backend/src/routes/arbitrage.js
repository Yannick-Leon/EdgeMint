import { Router } from 'express';
import { fetchQuotes } from '../services/exchangeService.js';
import { scanArbitrage } from '../services/arbitrageService.js';

export const arbRouter = Router();

arbRouter.get('/arbitrage/scan', async (req, res, next) => {
  try {
    const symbol = (req.query.symbol || 'BTCUSDT').toString().toUpperCase();
    const notional = Number(req.query.notional || 1000);

    const quotes = await fetchQuotes(symbol);
    const opps = scanArbitrage(quotes, notional);

    res.json({ symbol, notional, opportunities: opps });
  } catch (err) {
    next(err);
  }
});
