import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import { startWorker } from '#src/executor/worker.js';
import { createQueue, getQueue } from '#src/executor/queue.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';

const e2e = (process.env.E2E_WORKER_TESTS === '1') ? describe : describe.skip;

e2e('E2E: Multi-node journeys complete', () => {
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
    try { await getQueue().obliterate({ force: true }); } catch {} // eslint-disable-line no-empty
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('completes two variants with 6+ nodes each', async () => {
    jest.setTimeout(20000);

    const create = async (name: string, truePath: boolean) => {
      const body = truePath ? {
        id: '',
        name,
        start_node_id: 'm1',
        nodes: [
          { id: 'm1', type: 'MESSAGE', message: 'm1', next_node_id: 'd1' },
          { id: 'd1', type: 'DELAY', duration_seconds: 1, next_node_id: 'm2' },
          { id: 'm2', type: 'MESSAGE', message: 'm2', next_node_id: 'c1' },
          { id: 'c1', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '>', value: 50 }, on_true_next_node_id: 'm3', on_false_next_node_id: 'm4' },
          { id: 'm3', type: 'MESSAGE', message: 'true path', next_node_id: 'd2' },
          { id: 'd2', type: 'DELAY', duration_seconds: 1, next_node_id: null }
        ]
      } : {
        id: '',
        name,
        start_node_id: 'm1',
        nodes: [
          { id: 'm1', type: 'MESSAGE', message: 'm1', next_node_id: 'd1' },
          { id: 'd1', type: 'DELAY', duration_seconds: 1, next_node_id: 'm2' },
          { id: 'm2', type: 'MESSAGE', message: 'm2', next_node_id: 'c1' },
          { id: 'c1', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '>', value: 50 }, on_true_next_node_id: 'm3', on_false_next_node_id: 'm4' },
          { id: 'm4', type: 'MESSAGE', message: 'false path', next_node_id: 'd2' },
          { id: 'd2', type: 'DELAY', duration_seconds: 1, next_node_id: null }
        ]
      };
      const res = await fetch(`${BASE_URL}/journeys`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      expect(res.status).toBe(201);
      const { journeyId } = await res.json() as { journeyId: string };
      return journeyId;
    };

    const journeyIdTrue = await create('Journey True Variant', true);
    const journeyIdFalse = await create('Journey False Variant', false);

    const trigger = async (journeyId: string, age: number, pid: string) => {
      const res = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: { id: pid, age, language: 'en', condition: 'hip_replacement' } })
      });
      expect(res.status).toBe(202);
      const { runId } = await res.json() as { runId: string };
      return runId;
    };

    const runIdTrue = await trigger(journeyIdTrue, 75, 'p-multi-true');
    const runIdFalse = await trigger(journeyIdFalse, 35, 'p-multi-false');

    const poll = async (runId: string) => {
      const deadline = Date.now() + 15000;
      let body: any;
      while (Date.now() < deadline) {
        const res = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
        if (res.status === 200) {
          body = await res.json();
          if (body.status === 'completed' || body.status === 'failed') {break;}
        }
        await new Promise(r => setTimeout(r, 250));
      }
      return body;
    };

    const resultTrue = await poll(runIdTrue);
    const resultFalse = await poll(runIdFalse);

    expect(resultTrue.status).toBe('completed');
    expect(resultFalse.status).toBe('completed');
    // With trace-based status, currentNodeId reflects the last processed node (d2)
    expect(resultTrue).toMatchObject({ runId: runIdTrue, journeyId: journeyIdTrue, currentNodeId: 'd2', patientContext: { id: 'p-multi-true' } });
    expect(resultFalse).toMatchObject({ runId: runIdFalse, journeyId: journeyIdFalse, currentNodeId: 'd2', patientContext: { id: 'p-multi-false' } });
  });
});
