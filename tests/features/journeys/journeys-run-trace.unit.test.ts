import { FastifyReply, FastifyRequest } from 'fastify';
import { getJourneyRunTrace } from '#src/controllers/journeys-controller.js';
import * as db from '#src/db/mongodb-interface.js';

jest.mock('#src/db/mongodb-interface.js');

describe('getJourneyRunTrace controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with trace payload when found', async () => {
    (db.getRunTrace as jest.Mock).mockResolvedValue({
      runId: 'r1',
      journeyId: 'j1',
      status: 'completed',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      currentNodeId: 'm1',
      patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip_replacement' },
      steps: [ { nodeId: 'm1', type: 'MESSAGE', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), result: { message: 'hi' } } ]
    });

    const request = {
      params: { runId: 'r1' },
      log: { error: jest.fn() }
    } as unknown as FastifyRequest;

    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    await getJourneyRunTrace(request, reply);
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ runId: 'r1', status: 'completed' }));
  });

  test('returns 404 when trace not found', async () => {
    (db.getRunTrace as jest.Mock).mockResolvedValue(null);

    const request = {
      params: { runId: 'missing' },
      log: { error: jest.fn() }
    } as unknown as FastifyRequest;

    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    await getJourneyRunTrace(request, reply);
    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Trace not found' });
  });
});
