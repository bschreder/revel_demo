import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';
import { ConnectOptions } from 'mongoose';

/**
 * Integration tests that assert 400 is returned when non-UUID params are provided
 * for journeyId and runId. Existing tests already assert 404 for valid-but-missing UUIDs.
 */

describe('Invalid path params return 400', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5950 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const dbName = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };

  beforeAll(async () => {
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }
    process.env.BULLMQ_QUEUE_NAME = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;
    fastifyInstance = await startServer(PORT);
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('POST /journeys/:journeyId/trigger with non-UUID journeyId returns 400', async () => {
    const res = await fetch(`${BASE_URL}/journeys/not-a-uuid/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: { id: 'p1', age: 60, language: 'en', condition: 'hip_replacement' }
      })
    });
    expect([400, 422]).toContain(res.status); // Fastify may use 400; zod can map to 400/422 depending on setup
  });

  test('GET /journeys/runs/:runId with non-UUID runId returns 400', async () => {
    const res = await fetch(`${BASE_URL}/journeys/runs/not-a-uuid`);
    expect([400, 422]).toContain(res.status);
  });

  test('GET /journeys/runs/:runId/trace with non-UUID runId returns 400', async () => {
    const res = await fetch(`${BASE_URL}/journeys/runs/not-a-uuid/trace`);
    expect([400, 422]).toContain(res.status);
  });
});
