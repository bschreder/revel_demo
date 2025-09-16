import { FastifyInstance } from 'fastify';
import healthcheckRoutes from '#src/routes/healthcheck.js';

describe('healthcheckRoutes unit', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    const Fastify = (await import('fastify')).default;
    fastify = Fastify();
    await fastify.register(healthcheckRoutes);
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('should return 200 and status ok', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/healthcheck'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
