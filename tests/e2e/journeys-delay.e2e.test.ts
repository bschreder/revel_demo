import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { startWorker, stopWorker } from '#src/executor/worker.js';
import { createQueue, closeQueue, getQueue } from '#src/executor/queue.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;

e2e('E2E: DELAY node execution', () => {
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
    startWorker();
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
    // Clean queue jobs to avoid cross-test contamination
    try { await getQueue().obliterate({ force: true }); } catch {}
  });

  afterAll(async () => {
    await stopWorker();
    await closeQueue();
    await fastifyInstance.close();
    await disconnect();
  });

  test('DELAY followed by MESSAGE completes after ~1s', async () => {
    jest.setTimeout(15000);

    const createRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'E2E Delay Journey',
        start_node_id: 'd1',
        nodes: [
          { id: 'd1', type: 'DELAY', duration_seconds: 1, next_node_id: 'm1' },
          { id: 'm1', type: 'MESSAGE', message: 'done', next_node_id: null }
        ]
      })
    });
    expect(createRes.status).toBe(201);
    const { journeyId } = await createRes.json() as { journeyId: string };

    const triggerRes = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: { id: 'p-delay-1', age: 25, language: 'en', condition: 'hip_replacement' }
      })
    });
    expect(triggerRes.status).toBe(202);
    const { runId } = await triggerRes.json() as { runId: string };

    // Immediately after trigger, status is expected to be in_progress
    const initial = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
    expect(initial.status).toBe(200);
    const initialBody = await initial.json() as any;
    expect(initialBody.status).toBe('in_progress');

    // Poll for completion within 10s
    const deadline = Date.now() + 10000;
    let status = initialBody.status as string;
    let lastResponse: any = initialBody;
    while (Date.now() < deadline) {
      const res = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
      if (res.status === 200) {
        lastResponse = await res.json();
        status = lastResponse.status;
        if (status === 'completed' || status === 'failed') break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    expect(status).toBe('completed');
    expect(lastResponse).toMatchObject({
      runId,
      journeyId,
      currentNodeId: 'd1',
      patientContext: { id: 'p-delay-1' }
    });
  });
});
