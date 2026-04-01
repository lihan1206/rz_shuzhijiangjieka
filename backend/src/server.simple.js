import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
