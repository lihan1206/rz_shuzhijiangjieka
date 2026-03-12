import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  logger.info({
    module: 'server',
    action: 'start',
    port: env.PORT,
    env: env.NODE_ENV
  });
});

async function shutdown(signal) {
  logger.info({
    module: 'server',
    action: 'shutdown',
    signal
  });

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
