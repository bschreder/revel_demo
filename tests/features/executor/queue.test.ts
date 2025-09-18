import { createQueue, getQueue, getQueueName } from '#src/executor/queue.js';

jest.mock('bullmq', () => {
  const mQueue = jest.fn().mockImplementation((name, options) => {
    return { name, options };
  });
  return { Queue: mQueue };
});

describe('queue.ts', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('createQueue sets and returns a Queue instance with provided name', () => {
    const queueName = 'test-queue';
    const queue = createQueue(queueName);
    expect(queue).toBeDefined();
    expect(queue.name).toBe(queueName);
  });

  test.skip('createQueue uses default name if none provided', () => {
    const queue = createQueue();
    expect(queue).toBeDefined();
    expect(queue.name).toBe('journey');
  });

  test.skip('getQueue returns the same Queue instance', () => {
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
    jest.resetModules();
    expect(() => getQueueName()).toThrow('Queue name is not defined');
  });
});
