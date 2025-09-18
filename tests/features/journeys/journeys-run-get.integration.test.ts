import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import { closeQueue } from '#src/executor/queue.js';
import { ConnectOptions } from 'mongoose';

describe('GET /journeys/runs/:runId (integration)', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5700 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const dbName = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };

  beforeAll(async () => {
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }
    // Ensure BullMQ queue uses a test-specific name
    process.env.BULLMQ_QUEUE_NAME = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;
    fastifyInstance = await startServer(PORT);
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
  });

  afterAll(async () => {
    await fastifyInstance.close();
    await closeQueue();
    await disconnect();
  });

  test('should return 200 and run status for a valid runId', async () => {
    // First, create a journey
    const journey = {
      id: '',
      name: 'Integration Journey',
      start_node_id: 'node1',
      nodes: [
        {
          id: 'node1',
          type: 'MESSAGE',
          message: 'Hello!',
          next_node_id: null
        }
      ]
    };
    const journeyRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey)
    });
    expect(journeyRes.status).toBe(201);
    const { journeyId } = await journeyRes.json() as { journeyId: string };

    // Trigger the journey to get a runId
    const triggerRes = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: {
          id: 'patient-001',
          age: 67,
          language: 'en',
          condition: 'hip_replacement'
        }
      })
    });
    expect(triggerRes.status).toBe(202);
    const { runId } = await triggerRes.json() as { runId: string };
    expect(typeof runId).toBe('string');

    // Now, fetch the run status
    const runRes = await fetch(`${BASE_URL}/journeys/runs/${runId}`);
    expect(runRes.status).toBe(200);
    const runData = await runRes.json();
    expect(runData).toHaveProperty('runId', runId);
    expect(runData).toHaveProperty('status');
    expect(runData).toHaveProperty('currentNodeId');
    expect(runData).toHaveProperty('patientContext');
  });

  test('should return 404 for a non-existent runId', async () => {
    const res = await fetch(`${BASE_URL}/journeys/runs/notfound`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ error: 'Run not found' });
  });
});
