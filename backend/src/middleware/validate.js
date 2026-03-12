import { AppError } from '../utils/errors.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((item) => item.message).join('；');
      next(new AppError(message || '请求参数不合法', 400, 'VALIDATION_ERROR'));
      return;
    }

    req[source] = result.data;
    next();
  };
}
