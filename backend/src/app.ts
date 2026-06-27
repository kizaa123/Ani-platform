import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes';
import { ensureUploadDirs } from './middleware/upload.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';

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
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use(
    '/api',
    apiRateLimiter
  );

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', platform: 'ANI Agricultural Exchange Platform' } });
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
