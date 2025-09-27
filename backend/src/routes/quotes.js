import { Router } from 'express';
import { fetchQuotes } from '../services/exchangeService.js';

export const quotesRouter = Router();

quotesRouter.get('/quotes', async (req, res, next) => {
  try {
    const symbol = (req.query.symbol || 'BTCUSDT').toString().toUpperCase();
    const quotes = await fetchQuotes(symbol);
    res.json({ symbol, quotes });
  } catch (err) {
    next(err);
  }
});
