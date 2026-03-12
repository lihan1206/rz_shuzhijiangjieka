import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import kioskRoutes from './routes/kioskRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((item) => item.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
