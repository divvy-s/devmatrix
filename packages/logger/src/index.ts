import { pino } from 'pino';

export const createLogger = (moduleName: string) => {
  const isDev = process.env.NODE_ENV !== 'production';

  return pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: 'web3-social',
      environment: process.env.NODE_ENV || 'development',
      module: moduleName,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
  });
};
