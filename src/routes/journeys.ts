import { FastifyInstance } from 'fastify';
import { postJourneyController } from '#src/controllers/journeys-controller.js';
import { journeySchema, journeyIdResponseSchema } from '#src/models/journey-schema.js';

/** Register journey routes 
 * @param fastify Fastify instance
*/
export default async function journeysRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /journeys
   * Create a new journey definition
   */
  fastify.post('/journeys', {
    schema: {
      body: journeySchema,
      response: {
        201: journeyIdResponseSchema
      }
    }
  }, postJourneyController);
}
