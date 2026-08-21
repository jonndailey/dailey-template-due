import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { readinessReport } from './health-state.js';
import { registerRoutes } from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_NAME = 'dailey-template-due';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      // Same-origin requests and native clients send no Origin header.
      origin: (origin, cb) => {
        if (!origin || origin === env.webOrigin) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '20mb' }));

  // Liveness: is the process up. Always 200 while we can answer at all.
  app.get('/health/live', (req, res) => res.json({ ok: true, service: SERVICE_NAME }));
  app.get('/healthz', (req, res) => res.json({ ok: true, service: SERVICE_NAME }));

  // Readiness: is the app actually able to do its job. This used to return
  // `{ok:true}` unconditionally, which made it worse than having no endpoint at
  // all — it actively asserted health while the schema was frozen and every
  // task operation was failing. It now reports the real migration state and
  // answers 503 when the app is serving but not working.
  app.get('/health/ready', (req, res) => {
    const report = readinessReport(SERVICE_NAME);
    res.status(report.ok ? 200 : 503).json(report);
  });

  registerRoutes(app);

  // Serve the built web app (single-container deploy). The SPA fallback keeps
  // the root path returning 200 even before the database is reachable.
  const staticDir = resolve(__dirname, env.staticDir || '../public');
  if (existsSync(join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/|health).*/, (req, res) => {
      res.sendFile(join(staticDir, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res
        .status(200)
        .send('Dailey Due API is running. Build the web app to serve the interface.');
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    const status = Number.isFinite(err?.statusCode) ? err.statusCode : 500;
    const clientMessage = status >= 500 ? 'Internal error' : String(err?.message || 'Request failed');
    res.status(status).json({
      error: clientMessage,
      detail: env.nodeEnv === 'development' ? String(err?.message || err) : undefined,
    });
  });

  return app;
}
