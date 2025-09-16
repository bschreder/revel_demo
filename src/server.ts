import Fastify, {FastifyInstance} from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import journeysRoutes from './routes/journeys.js';
import healthcheckRoutes from './routes/healthcheck.js';
import { authMiddleware } from './middleware/auth-middleware.js';


/**
 * Build and configure a Fastify server instance.
 * @returns {Fastify.FastifyInstance} Configured Fastify server
 */
export function buildServer(): FastifyInstance {
  const fastify = Fastify({ logger: true });
  fastify.addHook('preHandler', authMiddleware);
  fastify.register(journeysRoutes);
  fastify.register(healthcheckRoutes);
  return fastify;
}

/**
 * Start the Fastify server.
 * @param port Port number to listen on (default: 5000)
 * @returns Fastify server instance
 */
export async function startServer(port: number = 5000): Promise<FastifyInstance> {
  const fastify = buildServer();

  // Set up Zod type provider
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.withTypeProvider<ZodTypeProvider>();

  // Start the server
  try {
    const address = await fastify.listen({ port });
    fastify.log.info(`Server listening at ${address}`);
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}