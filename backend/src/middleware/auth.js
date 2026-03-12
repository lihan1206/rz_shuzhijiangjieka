import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function authRequired(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('未登录或登录已过期', 401, 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (_error) {
    next(new AppError('登录状态无效，请重新登录', 401, 'UNAUTHORIZED'));
  }
}
