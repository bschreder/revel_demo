import { Worker, QueueEvents, WorkerOptions, Job } from 'bullmq';
import { getRedisConfig } from '#src/db/redis-interface.js';
import pino from 'pino';
import { JobName } from './job.js';
import { actionProcessor, delayProcessor, conditionalProcessor } from './processor.js';
import { getQueueName } from './queue.js';

const logger = pino();
let workerInstance: Worker | null = null;

/**
 * Starts a BullMQ Worker to process jobs from the queue.
 * Selects the processor based on the job name.
 * @returns {Worker} BullMQ Worker instance
 */
export function startWorker(): Worker {
  const redisConfig = getRedisConfig();
  const options: WorkerOptions = { connection: redisConfig };

  const processorMap: Record<JobName, (job: Job) => Promise<string>> = {
    action: actionProcessor,
    delay: delayProcessor,
    conditional: conditionalProcessor
  };
  const processor = async (job: Job): Promise<string> => {
    const fn = processorMap[job.name as JobName];
    if (!fn) 
        throw new Error(`Unknown job name: ${job.name}`);
    return fn(job);
  };

  const worker = new Worker(getQueueName(), processor, options);

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Job failed');
  });
  worker.on('progress', (job, progress) => {
    logger.info({ jobId: job.id, progress }, 'Job progress');
  });
  worker.on('error', (err) => {
    logger.error({ error: err }, 'Worker error');
  });

  // Attach queue events for additional lifecycle logging
  const queueEvents = new QueueEvents(getQueueName(), { connection: redisConfig });
  queueEvents.on('waiting', ({ jobId }) => {
    logger.info({ jobId }, 'Job waiting');
  });
  queueEvents.on('active', ({ jobId }) => {
    logger.info({ jobId }, 'Job active');
  });
  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn({ jobId }, 'Job stalled');
  });
  queueEvents.on('drained', () => {
    logger.info('Queue drained');
  });
  queueEvents.on('error', (err) => {
    logger.error({ error: err }, 'QueueEvents error');
  });

  workerInstance = worker;
  return worker;
}

/**
 * Stops the BullMQ Worker instance if it exists.
 * @returns {Promise<void>} Resolves when the worker is closed
 */
export async function stopWorker(): Promise<void> {
  if (workerInstance) {
    logger.info('Shutting down BullMQ worker');
    await workerInstance.close();
    workerInstance = null;
  }
}