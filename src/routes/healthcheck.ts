import { FastifyInstance } from 'fastify';

/**
 * Healthcheck route handler.
 * @param fastify Fastify instance
 */
export default async function healthcheckRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/healthcheck', async (request, reply) => {
    return reply.code(200).send({ status: 'ok' });
  });
}
