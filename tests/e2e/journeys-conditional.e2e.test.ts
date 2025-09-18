import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { startWorker, stopWorker } from '#src/executor/worker.js';
import { createQueue, closeQueue, getQueue } from '#src/executor/queue.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;

e2e('E2E: CONDITIONAL branching (true and false)', () => {
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

  test('routes true branch when age > 50 and false otherwise', async () => {
    jest.setTimeout(15000);

    const createRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'E2E Conditional Journey',
        start_node_id: 'c1',
        nodes: [
          { id: 'c1', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '>', value: 50 }, on_true_next_node_id: 'm-true', on_false_next_node_id: 'm-false' },
          { id: 'm-true', type: 'MESSAGE', message: 'true path', next_node_id: null },
          { id: 'm-false', type: 'MESSAGE', message: 'false path', next_node_id: null }
        ]
      })
    });
    expect(createRes.status).toBe(201);
    const { journeyId } = await createRes.json() as { journeyId: string };

    const trigger = async (age: number, pid: string) => {
      const res = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: { id: pid, age, language: 'en', condition: 'hip_replacement' } })
      });
      expect(res.status).toBe(202);
      const { runId } = await res.json() as { runId: string };
      return runId;
    };

    const poll = async (runId: string) => {
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
      return body;
    };

    const runIdTrue = await trigger(60, 'p-true');
    const runIdFalse = await trigger(40, 'p-false');

    const resultTrue = await poll(runIdTrue);
    const resultFalse = await poll(runIdFalse);

    expect(resultTrue.status).toBe('completed');
    expect(resultFalse.status).toBe('completed');
    expect(resultTrue).toMatchObject({ runId: runIdTrue, journeyId, currentNodeId: 'c1', patientContext: { id: 'p-true' } });
    expect(resultFalse).toMatchObject({ runId: runIdFalse, journeyId, currentNodeId: 'c1', patientContext: { id: 'p-false' } });
  });
});
