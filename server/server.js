/* This code fixed By Tg:@ImxCodex */
import { createServer } from 'http';
import { app } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { telegramSessionService } from './services/telegramSession.service.js';

const server = createServer(app);

server.listen(config.port, () => {
  logger.info(`Stateless receipt sender listening on port ${config.port}`);
});

setInterval(() => {
  telegramSessionService.cleanupPending().catch(error => {
    logger.warn('Pending login cleanup failed', { error: error.message });
  });
}, 60 * 1000);

// ── Graceful shutdown ─────────────────────────────────────────────────────
// Cleanly disconnect all Telegram clients before the process dies.
// Without this, --watch restarts and Ctrl+C leave sessions locked in Telegram,
// causing AUTH_KEY_DUPLICATED on the very next connection attempt.
const gracefulShutdown = async (signal) => {
  logger.info(`[${signal}] Gracefully shutting down — disconnecting Telegram clients...`);
  try {
    await telegramSessionService.disconnectAll();
    logger.info('All Telegram clients disconnected cleanly.');
  } catch (err) {
    logger.warn('Error during Telegram client cleanup:', { error: err.message });
  }
  process.exit(0);
};

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

