import pino from 'pino';
import { env, isDev } from './config.js';

const transport = env.LOG_PRETTY && isDev
  ? { target: 'pino-pretty', options: { translateTime: 'SYS:standard' } }
  : undefined;

export const logger = pino({ level: isDev ? 'debug' : 'info' }, transport ? pino.transport(transport) : undefined);
