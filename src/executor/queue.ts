import { Queue, QueueOptions } from 'bullmq';
import { getRedisConfig } from '../db/redis-interface.js';
import pino from 'pino';

const logger = pino();
let queueName: string;
let queue: Queue;

/**
 * Creates and returns a BullMQ Queue instance.
 * @param {QueueName} name The name of the queue
 * @returns {Queue} BullMQ Queue instance
 */
export function createQueue(name?: string): Queue {
  if (!queueName)
    queueName = name || process.env.BULLMQ_QUEUE_NAME || 'journey';

  const redisConfig = getRedisConfig();
  const options: QueueOptions = { connection: redisConfig };
  logger.info({ queue: queueName }, 'Creating BullMQ queue');
  queue = new Queue(queueName, options);
  return queue;
}

/**
 * Gets the existing BullMQ Queue instance or creates a new one.
 * @returns {Queue} Existing BullMQ Queue instance
 */
export function getQueue(): Queue {
  if (!queue)
    queue = createQueue(queueName);

  return queue;
}

/**
 * Gets the name of the queue.
 * @returns {string} The name of the queue
 */
export function getQueueName(): string {
  if (!queueName)
    throw new Error('Queue name is not defined');

  return queueName;
}

/**
 * Closes the BullMQ Queue instance if it exists.
 * @returns {Promise<void>} Resolves when the queue is closed
 */
export async function closeQueue(): Promise<void> {
  if (queue) {
    logger.info({ queue: queueName }, 'Closing BullMQ queue');
    await queue.close();
    queue = undefined as unknown as Queue;
    queueName = undefined as unknown as string;
  }
}