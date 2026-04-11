import { Queue, Worker, Processor, WorkerOptions, QueueOptions } from 'bullmq';
import { redisConnection } from './redis';

export const createQueue = (
  name: string,
  opts?: Omit<QueueOptions, 'connection'>,
) => {
  return new Queue(name, {
    connection: redisConnection,
    ...opts,
  });
};

export const createWorker = <T1, T2, T3 extends string>(
  name: string,
  processor: Processor<T1, T2, T3>,
  opts?: Omit<WorkerOptions, 'connection'>,
) => {
  return new Worker(name, processor, {
    connection: redisConnection,
    ...opts,
  });
};
