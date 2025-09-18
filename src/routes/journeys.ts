import { FastifyInstance } from 'fastify';
import { getJourneyRunStatus, postJourney, triggerJourney, getJourneyRunTrace } from '#src/controllers/journeys-controller.js';
import { journeySchema, journeyIdResponseSchema, jobNodeResponseSchema, journeyIdParamsSchema, runIdParamsSchema } from '#src/models/journey-schema.js';
import { runTraceResponseSchema } from '#src/models/trace-schema.js';
import { triggerJourneyRequestSchema, triggerJourneyResponseSchema } from '#src/models/journey-schema.js';


/** Register journey routes 
 * @param {FastifyInstance} fastify Fastify instance
 * @returns {Promise<void>}
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
      params: journeyIdParamsSchema,
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
      params: runIdParamsSchema,
      response: {
        200: jobNodeResponseSchema
      }
    }
  }, getJourneyRunStatus);

  /**
   * GET /journeys/runs/:runId/trace
   * Fetch execution trace of a specific journey run
   */
  fastify.get('/journeys/runs/:runId/trace', {
    schema: {
      params: runIdParamsSchema,
      response: {
        200: runTraceResponseSchema
      }
    }
  }, getJourneyRunTrace);
}
