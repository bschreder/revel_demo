import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { teardownTestInfra } from '#test/utils/test-teardown.js';

describe('healthcheck integration', () => {
  let fastifyInstance: FastifyInstance;
  const workerId = Number(process.env.JEST_WORKER_ID || '1');
  const PORT = 5500 + (workerId - 1);
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    fastifyInstance = await startServer(PORT);
  });

  afterAll(async () => {
    await teardownTestInfra(fastifyInstance);
  });

  test('should return 200 and status ok', async () => {
    const response = await fetch(`${BASE_URL}/healthcheck`);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: 'ok' });
  });
});
