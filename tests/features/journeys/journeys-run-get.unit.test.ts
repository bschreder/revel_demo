import * as journeysService from '#src/services/journeys-service.js';
import { JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getJourneyRunStatus } from '#src/controllers/journeys-controller.js';
jest.mock('#src/services/journeys-service.js');

describe('getJourneyRunById', () => {
  test('returns run if found', async () => {
    const mockRun: JobNodeResponseSchema = {
      runId: 'abc',
      status: 'in_progress',
      journeyId: 'journey-1',
      currentNodeId: 'node-1',
      patientContext: { id: 'patient-1', age: 30, language: 'en', condition: 'hip_replacement' }
    };
    jest.spyOn(journeysService, 'getJourneyRunById').mockResolvedValueOnce(mockRun);
    const result = await journeysService.getJourneyRunById('abc');
    expect(result).toEqual(mockRun);
  });

  test('returns null if not found', async () => {
    jest.spyOn(journeysService, 'getJourneyRunById').mockResolvedValueOnce(null);
    const result = await journeysService.getJourneyRunById('notfound');
    expect(result).toBeNull();
  });
});

describe('getJourneyRunStatus controller (merged)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with run payload when found', async () => {
    (journeysService.getJourneyRunById as jest.Mock).mockResolvedValue({
      runId: 'abc',
      status: 'in_progress',
      journeyId: 'journey-1',
      currentNodeId: 'node-1',
      patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip_replacement' }
    });

    const request = {
      params: { runId: 'abc' },
      log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
    } as unknown as FastifyRequest;

    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    await getJourneyRunStatus(request, reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ runId: 'abc', status: 'in_progress' }));
  });

  test('returns 404 when run not found', async () => {
    (journeysService.getJourneyRunById as jest.Mock).mockResolvedValue(null);

    const request = {
      params: { runId: 'missing' },
      log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
    } as unknown as FastifyRequest;

    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    await getJourneyRunStatus(request, reply);

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Run not found' });
  });

  test('returns 500 when service throws', async () => {
    (journeysService.getJourneyRunById as jest.Mock).mockRejectedValue(new Error('boom'));
    const request = {
      params: { runId: 'abc' },
      log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
    } as unknown as FastifyRequest;
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;
    await getJourneyRunStatus(request, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to fetch journey run status' });
  });
});
