import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { startWorker, stopWorker } from '#src/executor/worker.js';
import { createQueue, closeQueue, getQueue } from '#src/executor/queue.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;

e2e('E2E: GET run state after completion', () => {
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
    try { await getQueue().obliterate({ force: true }); } catch {}
  });

  afterAll(async () => {
    await stopWorker();
    await closeQueue();
    await fastifyInstance.close();
    await disconnect();
  });

  test('returns completed status and expected fields', async () => {
    const createRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'E2E Message Only',
        start_node_id: 'm1',
        nodes: [ { id: 'm1', type: 'MESSAGE', message: 'hello', next_node_id: null } ]
      })
    });
    expect(createRes.status).toBe(201);
    const { journeyId } = await createRes.json() as { journeyId: string };

    const triggerRes = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient: { id: 'p-x', age: 33, language: 'en', condition: 'knee_replacement' } })
    });
    expect(triggerRes.status).toBe(202);
    const { runId } = await triggerRes.json() as { runId: string };

    const deadline = Date.now() + 10000;
    let body: any = null;
    while (Date.now() < deadline) {
      const res = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
      if (res.status === 200) {
        body = await res.json();
        if (body.status === 'completed' || body.status === 'failed') break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    expect(body.status).toBe('completed');
    expect(body).toMatchObject({ runId, journeyId, currentNodeId: 'm1', patientContext: { id: 'p-x' } });
  });
});
