import { FastifyRequest, FastifyReply } from 'fastify';
import { Journey } from '#src/models/node-types.js';
import { saveJourney, triggerJourneyService } from '#src/services/journeys-service.js';
import { triggerJourneyRequestSchema } from '#src/models/journey-schema.js';
import { randomUUID } from 'crypto';
import { JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { getJourneyRunById } from '#src/services/journeys-service.js';
import { getRunTrace } from '#src/db/mongodb-interface.js';
import { RunTraceResponse } from '#src/models/trace-schema.js';

/**
 * Handles POST /journeys to create a new journey definition.
 * @param {FastifyRequest} request FastifyRequest containing the journey in the body
 * @param {FastifyReply} reply FastifyReply for sending the response
 * @returns {Promise<void>} Promise that resolves when the response is sent
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
 * @param {FastifyRequest} request FastifyRequest containing patient context in the body
 * @param {FastifyReply} reply FastifyReply for sending the response
 * @returns {Promise<void>} Promise that resolves when the response is sent
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
 * @param {FastifyRequest} request FastifyRequest containing the runId param
 * @param {FastifyReply} reply FastifyReply for sending the response
 * @returns {Promise<JobNodeResponseSchema | void>} The run status or void if an error occurs
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

/**
 * Handles GET /journeys/runs/:runId/trace to fetch the execution trace of a journey run.
 * @param {FastifyRequest} request FastifyRequest containing the runId param
 * @param {FastifyReply} reply FastifyReply for sending the response
 * @returns {Promise<RunTraceResponse | void>} The run trace or void if an error occurs
 */
export async function getJourneyRunTrace(request: FastifyRequest, reply: FastifyReply): Promise<RunTraceResponse | void> {
  const { runId } = request.params as { runId: string };
  try {
    const trace = await getRunTrace(runId);
    if (!trace) {
      reply.code(404).send({ error: 'Trace not found' });
      return;
    }
    reply.code(200).send(trace);
  } catch (err) {
    request.log.error({ err }, 'Failed to fetch journey run trace');
    reply.code(500).send({ error: 'Failed to fetch journey run trace' });
  }
}
