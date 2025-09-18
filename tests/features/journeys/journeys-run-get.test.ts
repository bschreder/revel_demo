import * as journeysService from '#src/services/journeys-service.js';
import { JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { getJourneyById } from '#src/db/mongodb-interface.js';

jest.mock('#src/db/journey-run-interface.js');

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
