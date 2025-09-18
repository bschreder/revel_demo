import { FastifyInstance } from 'fastify';
import { getJourneyRunStatus, postJourney, triggerJourney } from '#src/controllers/journeys-controller.js';
import { journeySchema, journeyIdResponseSchema, jobNodeResponseSchema } from '#src/models/journey-schema.js';
import { triggerJourneyRequestSchema, triggerJourneyResponseSchema } from '#src/models/journey-schema.js';


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
  }, postJourney);

  /**
   * POST /journeys/:journeyId/trigger
   * Start a new execution run of a specific journey for a patient
   */
  fastify.post('/journeys/:journeyId/trigger', {
    schema: {
      body: triggerJourneyRequestSchema,
      response: {
        202: triggerJourneyResponseSchema
      }
    }
  }, triggerJourney);

  /**
   * GET /journeys/runs/:runId
   * Fetch the status of a specific journey run
   */
  fastify.get('/journeys/runs/:runId', {
    schema: {
      response: {
        200: jobNodeResponseSchema
      }
    }
  }, getJourneyRunStatus);
}
