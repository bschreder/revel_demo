import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { startWorker } from '#src/executor/worker.js';
import { createQueue } from '#src/executor/queue.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;
e2e('E2E: MESSAGE journey with worker', () => {
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
    // Explicitly create the queue with the expected name to avoid any mismatch
    createQueue(TEST_QUEUE);
    fastifyInstance = await startServer(PORT);
    startWorker();
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('completes MESSAGE-only journey', async () => {
    const createRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'E2E Message Journey',
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'MESSAGE', message: 'hi', next_node_id: null }
        ]
      })
    });
    expect(createRes.status).toBe(201);
    const { journeyId } = await createRes.json() as { journeyId: string };

    const triggerRes = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: { id: 'p1', age: 42, language: 'en', condition: 'hip_replacement' }
      })
    });
    expect(triggerRes.status).toBe(202);
    const { runId } = await triggerRes.json() as { runId: string };

    // Poll for completion
    const deadline = Date.now() + 10000; // 10s timeout
    let status = 'in_progress';
    let lastResponse: any = null;
    while (Date.now() < deadline) {
      const res = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
      if (res.status === 200) {
        lastResponse = await res.json();
        status = lastResponse.status;
        if (status === 'completed' || status === 'failed') {break;}
      }
      await new Promise(r => setTimeout(r, 200));
    }

    expect(status).toBe('completed');
    expect(lastResponse).toMatchObject({
      runId,
      journeyId,
      currentNodeId: 'node1',
      patientContext: { id: 'p1' }
    });

    // Also assert the execution trace content
    const traceRes = await fetch(`${BASE_URL}/journeys/runs/${runId}/trace`);
    expect(traceRes.status).toBe(200);
    const trace = await traceRes.json() as any;
    expect(trace).toMatchObject({ runId, journeyId, status: 'completed' });
    expect(Array.isArray(trace.steps)).toBe(true);
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0]).toMatchObject({ nodeId: 'node1', type: 'MESSAGE', result: { message: 'hi' } });
  });
});
