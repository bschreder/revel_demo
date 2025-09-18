import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';
import { ConnectOptions } from 'mongoose';
import { startWorker } from '#src/executor/worker.js';
import { createQueue, getQueue } from '#src/executor/queue.js';

describe('GET /journeys/runs/:runId/trace (integration)', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5900 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const dbName = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };
  const TEST_QUEUE = `jobs-test-${workerId}`;

  beforeAll(async () => {
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }
    process.env.BULLMQ_QUEUE_NAME = TEST_QUEUE;
    createQueue(TEST_QUEUE);
    fastifyInstance = await startServer(PORT);
    startWorker();
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
    try { await getQueue().obliterate({ force: true }); } catch {} // eslint-disable-line no-empty
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('returns full trace with steps for a simple journey', async () => {
    jest.setTimeout(15000);
    // Arrange: create a journey with MESSAGE -> DELAY -> MESSAGE
    const journey = {
      id: '',
      name: 'Trace Journey',
      start_node_id: 'm1',
      nodes: [
        { id: 'm1', type: 'MESSAGE', message: 'hello', next_node_id: 'd1' },
        { id: 'd1', type: 'DELAY', duration_seconds: 1, next_node_id: 'm2' },
        { id: 'm2', type: 'MESSAGE', message: 'done', next_node_id: null }
      ]
    };
    const createRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey)
    });
    expect(createRes.status).toBe(201);
    const { journeyId } = await createRes.json() as { journeyId: string };

    // Act: trigger and poll status until completed
    const triggerRes = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: { id: 'p-trace', age: 70, language: 'en', condition: 'hip_replacement' }
      })
    });
    expect(triggerRes.status).toBe(202);
    const { runId } = await triggerRes.json() as { runId: string };

    const started = Date.now();
    let status = 'in_progress';
    let currentNodeId: string | null = null;
    while (Date.now() - started < 5000) {
      const statusRes = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
      expect(statusRes.status).toBe(200);
      const statusJson = await statusRes.json() as { status: string; currentNodeId: string };
      status = statusJson.status;
      currentNodeId = statusJson.currentNodeId;
      if (status === 'completed') {break;}
      await new Promise(r => setTimeout(r, 100));
    }
    expect(status).toBe('completed');
    expect(currentNodeId).toBe('m2');

    // Assert: fetch trace and validate shape and content
    const traceRes = await fetch(`${BASE_URL}/journeys/runs/${runId}/trace`);
    expect(traceRes.status).toBe(200);
    const trace = await traceRes.json() as {
      runId: string;
      journeyId: string;
      status: string;
      steps: Array<{ nodeId: string; type: string; startedAt: string; finishedAt: string | null; result?: any }>;
    };
    expect(trace.runId).toBe(runId);
    expect(trace.journeyId).toBe(journeyId);
    expect(trace.status).toBe('completed');
    expect(Array.isArray(trace.steps)).toBe(true);
    expect(trace.steps).toHaveLength(3);
    // Steps order and types
    expect(trace.steps[0]).toMatchObject({ nodeId: 'm1', type: 'MESSAGE' });
    expect(trace.steps[1]).toMatchObject({ nodeId: 'd1', type: 'DELAY', result: { duration_seconds: 1 } });
    expect(trace.steps[2]).toMatchObject({ nodeId: 'm2', type: 'MESSAGE', result: { message: 'done' } });
    // Timestamps basic sanity
    for (const s of trace.steps) {
      expect(typeof s.startedAt).toBe('string');
      expect(['string', 'object']).toContain(typeof s.finishedAt === 'string' ? 'string' : 'object');
    }
  });

  test('returns 404 when runId does not exist', async () => {
    const res = await fetch(`${BASE_URL}/journeys/runs/00000000-0000-0000-0000-000000000000/trace`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: 'Trace not found' });
  });
});
