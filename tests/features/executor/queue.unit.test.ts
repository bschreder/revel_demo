import { createQueue, getQueue, getQueueName, closeQueue } from '#src/executor/queue.js';

jest.mock('bullmq', () => {
  const mQueue = jest.fn().mockImplementation((name, options) => {
    return { name, options, close: jest.fn() };
  });
  return { Queue: mQueue };
});

describe('queue.ts', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closeQueue();
  });

  afterEach(async () => {
    await closeQueue();
  });

  test('createQueue sets and returns a Queue instance with provided name', () => {
    const queueName = 'test-queue';
    const queue = createQueue(queueName);
    expect(queue).toBeDefined();
    expect(queue.name).toBe(queueName);
  });

  test('createQueue uses default name if none provided', () => {
    const prev = process.env.BULLMQ_QUEUE_NAME;
    delete process.env.BULLMQ_QUEUE_NAME;
    const queue = createQueue();
    expect(queue).toBeDefined();
    expect(queue.name).toBe('journey');
    if (prev !== undefined) {process.env.BULLMQ_QUEUE_NAME = prev;} else {delete process.env.BULLMQ_QUEUE_NAME;}
  });

  test('getQueue returns the same Queue instance', () => {
    const queueName = 'another-queue';
    const created = createQueue(queueName);
    const retrieved = getQueue();
    expect(retrieved).toBe(created);
    expect(retrieved.name).toBe(queueName);
  });

  test('getQueueName returns the queue name', () => {
    const queueName = 'my-queue';
    createQueue(queueName);
    expect(getQueueName()).toBe(queueName);
  });

  test('getQueueName throws if queue not created', () => {
    // Ensure state is reset
    expect(() => getQueueName()).toThrow('Queue name is not defined');
  });
});
