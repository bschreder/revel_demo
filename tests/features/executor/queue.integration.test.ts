import { createQueue, getQueue, getQueueName, closeQueue } from '#src/executor/queue.js';
import { Queue } from 'bullmq';

describe('BullMQ Queue', () => {
  const TEST_QUEUE = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;

  afterEach(async () => {
    await closeQueue();
  });

  test('should create a BullMQ queue instance', () => {
    const queue = createQueue(TEST_QUEUE);
    expect(queue).toBeInstanceOf(Queue);
    expect(queue.name).toBe(TEST_QUEUE);
  });

  test('should return the same Queue instance from getQueue', () => {
    const createdQueue = createQueue(TEST_QUEUE);
    const retrievedQueue = getQueue();
    expect(retrievedQueue).toBe(createdQueue);
    expect(retrievedQueue.name).toBe(TEST_QUEUE);
  });

  test('should return the correct queue name from getQueueName', () => {
    createQueue(TEST_QUEUE);
    const name = getQueueName();
    expect(name).toBe(TEST_QUEUE);
  });

  test('should throw error if getQueueName is called before createQueue', () => {
    // Clear module state by re-importing the module in a fresh context
    jest.resetModules();
    expect(() => getQueueName()).toThrow('Queue name is not defined');
  });

  test('should create queue with default name if none provided', async () => {
    const originalEnv = process.env.BULLMQ_QUEUE_NAME;
    delete process.env.BULLMQ_QUEUE_NAME;

    const queue = createQueue();
    expect(queue).toBeInstanceOf(Queue);
    expect(queue.name).toBe('journey');

    // Cleanup
    await closeQueue();
    if (originalEnv) {process.env.BULLMQ_QUEUE_NAME = originalEnv;}
  });
});