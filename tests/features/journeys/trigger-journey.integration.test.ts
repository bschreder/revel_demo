import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { ConnectOptions } from 'mongoose';


describe('POST /journeys/:journeyId/trigger (integration)', () => {
  let fastifyInstance: FastifyInstance;
  const dbName = 'revelai-test';
  const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };
  type JourneyTriggerIdResponse = { runId: string }; 

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

  test('should return 202 and runId for valid request', async () => {
    const response = await fetch('http://localhost:5000/journeys/test-journey-id/trigger', {
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
    const response = await fetch('http://localhost:5000/journeys/test-journey-id/trigger', {
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
});
