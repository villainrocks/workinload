/* This code fixed By Tg:@ImxCodex */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import compatAuthRoutes from './routes/compatAuth.routes.js';
import compatTelegramRoutes from './routes/compatTelegram.routes.js';
import compatGroupsRoutes from './routes/compatGroups.routes.js';
import compatAdminRoutes from './routes/compatAdmin.routes.js';
import configRoutes from './routes/config.routes.js';
import logsRoutes from './routes/logs.routes.js';
import { authenticateCompat } from './middleware/compatAuth.js';
import { receiptGeneratorService } from './services/receiptGenerator.service.js';
import { mediaStoreService } from './services/mediaStore.service.js';

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDistDir = join(__dirname, '..', 'dist');

import { AppError } from './utils/errors.js';

app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' })); // Reduced from 10mb for safety
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(compression());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'stateless',
  });
});

// Image generation validation middleware
const validateImageRequest = (req, res, next) => {
  const { width = 720, height = 1280 } = req.body;
  
  if (width > config.limits.maxImageWidth || height > config.limits.maxImageHeight) {
    return next(AppError.badRequest(`Image dimensions exceed limits (Max: ${config.limits.maxImageWidth}x${config.limits.maxImageHeight})`));
  }

  if (width < 100 || height < 100) {
    return next(AppError.badRequest('Image dimensions too small (Min: 100x100)'));
  }

  next();
};

// Strict rate limit for resource-heavy generation - disabled for development
const generationRateLimit = (req, res, next) => next();

app.post('/generate', authenticateCompat, generationRateLimit, validateImageRequest, async (req, res, next) => {
  try {
    const { variables = {}, width = 720, height = 1280 } = req.body;
    const buffer = await receiptGeneratorService.generateBuffer(variables, width, height);
    const mediaId = mediaStoreService.put(buffer, 'image/png');
    logger.info('Receipt image generated', {
      mediaId,
      width: Number(width) || 720,
      height: Number(height) || 1280,
      receiptDate: variables.date,
      receiptTime: variables.time,
    });

    res.json({
      success: true,
      data: {
        filename: `receipt_${mediaId}.png`,
        path: `memory://${mediaId}`,
        url: `/generated/${mediaId}`,
        width: Number(width) || 720,
        height: Number(height) || 1280,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/preview', authenticateCompat, generationRateLimit, validateImageRequest, async (req, res, next) => {
  try {
    const { variables = {}, width = 720, height = 1280 } = req.body;
    const preview = await receiptGeneratorService.generatePreview(variables, width, height);
    res.json({
      success: true,
      data: { preview },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/generated/:id', (req, res) => {
  const item = mediaStoreService.get(req.params.id);
  if (!item) {
    return res.status(404).send('Not found');
  }
  res.setHeader('Content-Type', item.mimeType || 'image/png');
  return res.send(item.buffer);
});

app.use('/api/v1/auth', compatAuthRoutes);
app.use('/api/v1/telegram', compatTelegramRoutes);
app.use('/api/v1/groups', compatGroupsRoutes);
app.use('/api/v1/admin', compatAdminRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/logs', logsRoutes);

if (existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));

  app.get('/', (req, res) => {
    res.sendFile(join(frontendDistDir, 'index.html'));
  });

  app.get(/^\/(dashboard|drop|accounts|about|users|logs|login|404)(\/.*)?$/, (req, res) => {
    res.sendFile(join(frontendDistDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

app.use((err, req, res, _next) => {
  logger.error('Request failed', {
    path: req.path,
    method: req.method,
    message: err.message,
    code: err.code,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});
