import { startWorker, stopWorker } from '#src/executor/worker.js';

describe('Worker start without prior queue creation', () => {
  const TEST_QUEUE = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;

  beforeAll(() => {
    process.env.BULLMQ_QUEUE_NAME = TEST_QUEUE;
  });

  afterAll(async () => {
    await stopWorker();
  });

  test('starts using env default queue name', async () => {
    const worker = startWorker();
    expect(worker).toBeDefined();
  });
});
