import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { createQueue } from '#src/executor/queue.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;

e2e('E2E: Trigger non-existent journey', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5100 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const TEST_DB = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: TEST_DB, autoIndex: false };
  const TEST_QUEUE = `jobs-test-${workerId}`;

  beforeAll(async () => {
    dotenv.config();
    if (!isConnected()) {
      await connect(connectOptions);
    }
    process.env.BULLMQ_QUEUE_NAME = TEST_QUEUE;
    createQueue(TEST_QUEUE);
    fastifyInstance = await startServer(PORT);
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('returns 404 or 500 as per current behavior with error payload', async () => {
    const missingJourneyId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/journeys/${missingJourneyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient: { id: 'x', age: 10, language: 'en', condition: 'hip_replacement' } })
    });
    // Controller returns 404 when message includes 'not found'
    expect([404,500]).toContain(res.status);
    const body = await res.json() as any;
    expect(body).toHaveProperty('error');
  });
});
