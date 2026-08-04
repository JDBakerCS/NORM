import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { sequelize } from './config/database.js';
import apiRouter from './routes/index.js';
import githubWebhookRouter from './routes/githubWebhookRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use('/api/github/webhook', express.raw({ type: 'application/json', limit: '1mb' }), githubWebhookRouter);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (request, response) => {
  try {
    await sequelize.authenticate();
    response.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    response.status(503).json({ status: 'degraded', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
