import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';

describe('healthcheck integration', () => {
  let fastifyInstance: FastifyInstance;

  beforeAll(async () => {
    fastifyInstance = await startServer();
  });

  afterAll(async () => {
    await fastifyInstance.close();
  });

  it('should return 200 and status ok', async () => {
    const response = await fetch('http://localhost:5000/healthcheck');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: 'ok' });
  });
});
