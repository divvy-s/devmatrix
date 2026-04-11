import 'dotenv-safe/config';
import { outboxWorker } from './infrastructure/outbox.worker';
import { buildApp } from './app';
import { createLogger } from '@workspace/logger';

const logger = createLogger('server');

const start = async () => {
  try {
    const app = await buildApp();
    const port = parseInt(process.env.PORT || '8080', 10);

    if (process.env.NODE_ENV !== 'test') {
      outboxWorker.start();
    }

    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`Server listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
