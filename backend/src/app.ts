import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { ensureUploadDirs } from './middleware/upload.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';

function isAllowedDevOrigin(origin: string) {
  if (origin === 'http://localhost:3000') return true;
  if (origin.endsWith('.loca.lt')) return true;
  if (/^http:\/\/127\.0\.0\.1:3000$/.test(origin)) return true;
  if (/^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin)) return true;
  if (/^http:\/\/10\.\d+\.\d+\.\d+:3000$/.test(origin)) return true;
  return false;
}

function resolveCorsOrigin() {
  const configured = process.env.FRONTEND_URL?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);
    if (configured.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  };
}

export function createApp() {
  ensureUploadDirs();
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: resolveCorsOrigin(),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '25mb' }));

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use(
    '/api',
    apiRateLimiter
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        platform: 'ANI Agricultural Exchange Platform',
        features: ['research-library'],
      },
    });
  });

  app.use('/api', routes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  });

  return app;
}
