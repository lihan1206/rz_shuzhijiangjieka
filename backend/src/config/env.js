import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issue = parsed.error.issues.map((item) => `${item.path.join('.')}:${item.message}`).join('; ');
  throw new Error(`环境变量校验失败: ${issue}`);
}

export const env = parsed.data;
