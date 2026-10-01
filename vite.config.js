import { defineConfig } from 'vite';
import { handleApiRequest } from './server-api.js';

export default defineConfig({
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
});
