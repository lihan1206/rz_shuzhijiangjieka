import { logger } from '../config/logger.js';

export function notFoundHandler(_req, _res, next) {
  const error = new Error('接口不存在');
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

export function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = statusCode >= 500 ? '服务器开小差了，请稍后再试' : error.message;

  logger.error({
    module: 'http',
    action: 'error',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message: error.message,
    stack: error.stack
  });

  res.status(statusCode).json({
    success: false,
    code,
    message
  });
}
