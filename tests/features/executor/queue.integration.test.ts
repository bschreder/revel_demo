import { createQueue, getQueue, getQueueName } from '#src/executor/queue.js';
import { Queue } from 'bullmq';

describe('BullMQ Queue', () => {
  test('should create a BullMQ queue instance', () => {
    const queueName = 'test-queue';
    const queue = createQueue(queueName);
    expect(queue).toBeInstanceOf(Queue);
    expect(queue.name).toBe(queueName);
  });

  test('should return the same Queue instance from getQueue', () => {
    const queueName = 'integration-queue';
    const createdQueue = createQueue(queueName);
    const retrievedQueue = getQueue();
    expect(retrievedQueue).toBe(createdQueue);
    expect(retrievedQueue.name).toBe(queueName);
  });

  test('should return the correct queue name from getQueueName', () => {
    const queueName = 'queue-name-test';
    createQueue(queueName);
    const name = getQueueName();
    expect(name).toBe(queueName);
  });

  test('should throw error if getQueueName is called before createQueue', () => {
    // Clear module state by re-importing the module in a fresh context
    jest.resetModules();
    expect(() => getQueueName()).toThrow('Queue name is not defined');
  });

  test.skip('should create queue with default name if none provided', () => {
    const originalEnv = process.env.BULLMQ_QUEUE_NAME;
    delete process.env.BULLMQ_QUEUE_NAME;
    jest.resetModules();

    const queue = createQueue();
    expect(queue).toBeInstanceOf(Queue);
    expect(queue.name).toBe('journey');

    process.env.BULLMQ_QUEUE_NAME = originalEnv;
  });
});