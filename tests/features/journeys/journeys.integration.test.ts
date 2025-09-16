import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { Journey } from '#src/models/node-types.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { ConnectOptions } from 'mongoose';

const dbName = 'revelai-test';
const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };
type JourneyIdResponse = { journeyId: string };

describe('POST /journeys', () => {
  let fastifyInstance: FastifyInstance;

  beforeAll(async () => {
    // Ensure database connection
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }

    // Start the server
    fastifyInstance = await startServer();
  });

  afterAll(async () => {
    await fastifyInstance.close();
    await disconnect();
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

    const response = await fetch('http://localhost:5000/journeys', {
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

    const response = await fetch('http://localhost:5000/journeys', {
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

    const response = await fetch('http://localhost:5000/journeys', {
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
