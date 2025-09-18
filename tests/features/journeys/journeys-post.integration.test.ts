import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { Journey } from '#src/models/node-types.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { ConnectOptions } from 'mongoose';
import { JourneyIdResponse } from '#src/models/journey-schema.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import { closeQueue } from '#src/executor/queue.js';



describe('POST /journeys', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5600 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;
  const dbName = process.env.MONGODB_DATABASE || 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };

  beforeAll(async () => {
    // Ensure database connection
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }

    // Ensure BullMQ queue uses a test-specific name
    process.env.BULLMQ_QUEUE_NAME = `jobs-test-${process.env.JEST_WORKER_ID || '1'}`;

    // Start the server on a unique port per Jest worker
    fastifyInstance = await startServer(PORT);
  });

  afterAll(async () => {
    await fastifyInstance.close();
    await closeQueue();
    await disconnect();
  });

  afterEach(async () => {
    await JourneyModel.deleteMany({});
  });

  test('should create a new MESSAGE journey and return its id', async () => {
    const journey: Journey = {
      id: '',
      name: 'Test Journey',
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

    const response = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey)
    });
    
    expect(response.status).toBe(201);
    const data = await response.json() as JourneyIdResponse;
    expect(data.journeyId).toBeDefined();
    expect(typeof data.journeyId).toBe('string');
  });

  test('should create a new DELAY journey and return its id', async () => {
    const journey: Journey = {
      id: '',
      name: 'Test Journey',
      start_node_id: 'node1',
      nodes: [
        {
          id: 'node1',
          type: 'DELAY',
          duration_seconds: 5,
          next_node_id: null
        }
      ]
    };

    const response = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey)
    });

    expect(response.status).toBe(201);
    const data = await response.json() as JourneyIdResponse;
    expect(data.journeyId).toBeDefined();
    expect(typeof data.journeyId).toBe('string');
  });

  test('should create a new CONDITIONAL journey and return its id', async () => {
    const journey: Journey = {
      id: '',
      name: 'Test Journey',
      start_node_id: 'node1',
      nodes: [
        {
          id: 'node1',
          type: 'CONDITIONAL',
          condition: {
            field: 'user_input',
            operator: 'equals',
            value: 'hello'
          },
          on_true_next_node_id: 'node2',
          on_false_next_node_id: 'node3'
        }
      ]
    };

    const response = await fetch(`${BASE_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey)
    });

    expect(response.status).toBe(201);
    const data = await response.json() as JourneyIdResponse;
    expect(data.journeyId).toBeDefined();
    expect(typeof data.journeyId).toBe('string');
  });
});
