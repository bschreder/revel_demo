import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { closeQueue } from '#src/executor/queue.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { ConnectOptions } from 'mongoose';


describe('POST /journeys/:journeyId/trigger (integration)', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5800 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const dbName = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };
  type JourneyTriggerIdResponse = { runId: string }; 

  beforeAll(async () => {
    // Ensure database connection
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }

    // Start the server on a per-worker port
    // Ensure BullMQ queue uses a test-specific name
    process.env.BULLMQ_QUEUE_NAME = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;
    fastifyInstance = await startServer(PORT);
  });

  afterAll(async () => {
    await fastifyInstance.close();
    await closeQueue();
    await disconnect();
  });

  test('should return 202 and runId for valid request', async () => {
    // First create a journey to trigger
    const journeyCreateRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'Trigger Journey',
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'MESSAGE', message: 'hello', next_node_id: null }
        ]
      })
    });
    expect(journeyCreateRes.status).toBe(201);
    const { journeyId } = await journeyCreateRes.json() as { journeyId: string };

    const response = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: {
          id: 'p1',
          age: 60,
          language: 'en',
          condition: 'hip_replacement'
        }
      })
    });
    expect(response.status).toBe(202);
    const data = await response.json() as JourneyTriggerIdResponse;
    expect(data).toHaveProperty('runId');
    expect(typeof data.runId).toBe('string');
    expect(response.headers.get('location')).toMatch(/\/journeys\/runs\//);
  });

  test('should return 400 for invalid patient context', async () => {
    // Create a journey so the route logic proceeds to body validation
    const journeyCreateRes = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '',
        name: 'Trigger Journey Bad Body',
        start_node_id: 'node1',
        nodes: [
          { id: 'node1', type: 'MESSAGE', message: 'hello', next_node_id: null }
        ]
      })
    });
    expect(journeyCreateRes.status).toBe(201);
    const { journeyId } = await journeyCreateRes.json() as { journeyId: string };

    const response = await fetch(`${BASE_URL}/journeys/${journeyId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: {
          id: 'p1',
          age: 'not-a-number',
          language: 'en',
          condition: 'hip_replacement'
        }
      })
    });
    expect(response.status).toBe(400);
  });

  test('returns 404 when journey not found', async () => {
    const response = await fetch(`${BASE_URL}/journeys/00000000-0000-0000-0000-000000000000/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: { id: 'p1', age: 55, language: 'en', condition: 'hip_replacement' }
      })
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'Journey not found' });
  });
});
