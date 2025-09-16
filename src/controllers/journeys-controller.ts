import { FastifyRequest, FastifyReply } from 'fastify';
import { Journey } from '#src/models/node-types.js';
import { saveJourney } from '#src/services/journeys-service.js';

/**
 * Handles POST /journeys to create a new journey definition.
 * @param request FastifyRequest containing the journey in the body
 * @param reply FastifyReply for sending the response
 */
export async function postJourneyController(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const journey = request.body as Journey;
  const journeyId = crypto.randomUUID();
  await saveJourney({ ...journey, id: journeyId });
  reply.code(201).send({ journeyId });
}
