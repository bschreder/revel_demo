import { FastifyInstance } from 'fastify';

/**
 * Healthcheck route handler.
 * @param {FastifyInstance} fastify Fastify instance
 * @returns {Promise<void>}
 */
export default async function healthcheckRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/healthcheck', async (request, reply) => {
    return reply.code(200).send({ status: 'ok' });
  });
}
