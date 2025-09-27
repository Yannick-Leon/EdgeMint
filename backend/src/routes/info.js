import { Router } from 'express';
import { listExchanges } from '../services/exchangeService.js';

export const infoRouter = Router();

infoRouter.get('/exchanges', async (_req, res, next) => {
  try {
    const ex = await listExchanges();
    res.json({ exchanges: ex });
  } catch (err) {
    next(err);
  }
});

infoRouter.get('/ping', (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});
