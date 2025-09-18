
import { FastifyReply, FastifyRequest } from 'fastify';
import { triggerJourney } from '#src/controllers/journeys-controller.js';
import { triggerJourneyService } from '#src/services/journeys-service.js';

jest.mock('#src/services/journeys-service.js', () => ({
  triggerJourneyService: jest.fn()
}));

describe('triggerJourney', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 202 and runId on success', async () => {
    const mockRunId = 'mock-uuid';
    (triggerJourneyService as jest.Mock).mockResolvedValue(mockRunId);
    const request = {
      params: { journeyId: 'jid' },
      body: { patient: { id: 'p1', age: 60, language: 'en', condition: 'hip_replacement' } }
    } as unknown as FastifyRequest;
    const reply = {
      code: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as FastifyReply;
    await triggerJourney(request, reply);
    expect(reply.code).toHaveBeenCalledWith(202);
    expect(reply.header).toHaveBeenCalledWith('Location', expect.stringContaining('/journeys/runs/'));
    expect(reply.send).toHaveBeenCalledWith({ runId: mockRunId });
  });

  test('should return 500 on error', async () => {
    (triggerJourneyService as jest.Mock).mockRejectedValue(new Error('fail'));
    const request = {
      params: { journeyId: 'jid' },
      body: { patient: { id: 'p1', age: 60, language: 'en', condition: 'hip_replacement' } }
    } as unknown as FastifyRequest;
    const reply = {
      code: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn()
    } as unknown as FastifyReply;
    await triggerJourney(request, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to trigger journey run' });
  });
});
