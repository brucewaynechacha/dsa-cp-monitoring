import { defineConfig, loadEnv } from 'vite';
import { handleApiRequest } from './server-api.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEFAULT_BOT_TOKEN = '8893294829:AAGgq0tmv1CTr9Xsc_gZfTx1T-Ci832XM5U';
  const DEFAULT_CHAT_ID = '@hvvisduvbsdkvjbdkvbd';

  const botToken =
    env.VITE_TELEGRAM_BOT_TOKEN ||
    env.TELEGRAM_BOT_TOKEN ||
    process.env.VITE_TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    DEFAULT_BOT_TOKEN;

  let chatId =
    env.VITE_TELEGRAM_CHAT_ID ||
    env.VITE_TELEGRAM_CHANNEL_ID ||
    env.TELEGRAM_CHAT_ID ||
    env.TELEGRAM_CHANNEL_ID ||
    process.env.VITE_TELEGRAM_CHAT_ID ||
    process.env.VITE_TELEGRAM_CHANNEL_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    process.env.TELEGRAM_CHANNEL_ID ||
    DEFAULT_CHAT_ID;

  chatId = String(chatId).trim();
  if (chatId && !chatId.startsWith('@') && !chatId.startsWith('-')) {
    chatId = '@' + chatId;
  }

  return {
    base: './',
    define: {
      'import.meta.env.VITE_TELEGRAM_BOT_TOKEN': JSON.stringify(botToken),
      'import.meta.env.VITE_TELEGRAM_CHAT_ID': JSON.stringify(chatId)
    },
    server: {
      port: 5173
    },
    plugins: [
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              try {
                const handled = await handleApiRequest(req, res);
                if (!handled) next();
              } catch (err) {
                console.error('[Vite API Middleware Error]:', err);
                if (!res.headersSent) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err.message }));
                }
              }
              return;
            }
            next();
          });
        }
      }
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});
