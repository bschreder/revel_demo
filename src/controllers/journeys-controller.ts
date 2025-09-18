import { FastifyRequest, FastifyReply } from 'fastify';
import { Journey } from '#src/models/node-types.js';
import { saveJourney, triggerJourneyService } from '#src/services/journeys-service.js';
import { triggerJourneyRequestSchema } from '#src/models/journey-schema.js';
import { randomUUID } from 'crypto';
import { JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { getJourneyRunById } from '#src/services/journeys-service.js';

/**
 * Handles POST /journeys to create a new journey definition.
 * @param request FastifyRequest containing the journey in the body
 * @param reply FastifyReply for sending the response
 */
export async function postJourney(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const journey = request.body as Journey;
    const journeyId = randomUUID();
    await saveJourney({ ...journey, id: journeyId });
    reply.code(201).send({ journeyId });
  } catch (err) {
    request.log.error({ err }, 'Failed to create journey');
    reply.code(500).send({ error: 'Failed to create journey' });
  }
}

/**
 * Handles POST /journeys/:journeyId/trigger to start a new journey run for a patient.
 * @param request FastifyRequest containing patient context in the body
 * @param reply FastifyReply for sending the response
 */
export async function triggerJourney(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { journeyId } = request.params as { journeyId: string };
  const { patient } = triggerJourneyRequestSchema.parse(request.body);
  try {
    const runId = await triggerJourneyService(journeyId, patient);
    reply
      .code(202)
      .header('Location', `/journeys/runs/${runId}`)
      .send({ runId });
  } catch (err) {
    request.log.error({ err }, 'Failed to trigger journey run');
    const message = (err as Error)?.message || '';
    if (message.includes('not found')) {
      reply.code(404).send({ error: 'Journey not found' });
      return;
    }
    reply.code(500).send({ error: 'Failed to trigger journey run' });
  }
}



/**
 * Handles GET /journeys/runs/:runId to fetch the status of a journey run.
 * @param request FastifyRequest containing the runId param
 * @param reply FastifyReply for sending the response
 */
export async function getJourneyRunStatus(request: FastifyRequest, reply: FastifyReply): Promise<JobNodeResponseSchema | void> {
  const { runId } = request.params as { runId: string };
  try {
    const runNode: JobNodeResponseSchema | null = await getJourneyRunById(runId);
    if (!runNode) {
      reply.code(404).send({ error: 'Run not found' });
      return;
    }
    reply.code(200).send(runNode);
  } catch (err) {
    request.log.error({ err }, 'Failed to fetch journey run status');
    reply.code(500).send({ error: 'Failed to fetch journey run status' });
  }
}
