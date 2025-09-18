import { addJob, getJobStatus } from '#src/executor/job.js';
import { createQueue } from '#src/executor/queue.js';
import { JobNode } from '#src/models/journey-schema.js';
import { getJourneyById } from '#src/db/mongodb-interface.js';

// Mock dependencies
jest.mock('#src/db/mongodb-interface.js', () => ({
  getJourneyById: jest.fn(),
}));

const mockJourney = {
  id: 'journey-1',
  nodes: [
    { id: 'node-1', type: 'MESSAGE' },
    { id: 'node-2', type: 'DELAY', duration_seconds: 5 },
    { id: 'node-3', type: 'CONDITIONAL' },
  ],
};

describe('addJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should add a job to the queue', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    const queue = createQueue('action');
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-1',
      patientContext: { id: 'patient-1', age: 30, language: 'en', condition: 'hip_replacement' },
    };
    const jobId = await addJob(job);
    const addedJob = await queue.getJob(jobId);
    
    expect(addedJob).not.toBeNull();
    expect(addedJob?.data).toEqual(job);

    if (addedJob) {
      await addedJob.remove();
    }
  });

  test('should throw error if currentNodeId is missing', async () => {
    const job: any = { journeyId: 'journey-1', patientContext: {} };
    await expect(addJob(job)).rejects.toThrow('Invalid job data: missing currentNodeId or journeyId');
  });

  test('should throw error if journeyId is missing', async () => {
    const job: any = { currentNodeId: 'node-1', patientContext: {} };
    await expect(addJob(job)).rejects.toThrow('Invalid job data: missing currentNodeId or journeyId');
  });

  test('should throw error if journey not found', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(null);
    const job: JobNode = {
      journeyId: 'not-found',
      currentNodeId: 'node-1',
      patientContext: { id: 'patient-1', age: 30, language: 'en', condition: 'hip_replacement' },
    };
    await expect(addJob(job)).rejects.toThrow('Journey with ID not-found not found');
  });

  test('should throw error if node not found in journey', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'missing-node',
      patientContext: { id: 'patient-1', age: 30, language: 'en', condition: 'hip_replacement' },
    };
    await expect(addJob(job)).rejects.toThrow('Node with ID missing-node not found in journey journey-1');
  });

  test('should add a delay job with correct delay option', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    const queue = createQueue('journey');
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-2',
      patientContext: { id: 'patient-2', age: 40, language: 'es', condition: 'knee_replacement' },
    };
    const jobId = await addJob(job);
    const addedJob = await queue.getJob(jobId);
    expect(addedJob).not.toBeNull();
    expect(addedJob?.name).toBe('delay');
    expect(addedJob?.opts.delay).toBe(5000);
    if (addedJob) {
      await addedJob.remove();
    }
  });

  test('should add a conditional job', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    const queue = createQueue('journey');
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-3',
      patientContext: { id: 'patient-3', age: 50, language: 'en', condition: 'knee_replacement' },
    };
    const jobId = await addJob(job);
    const addedJob = await queue.getJob(jobId);
    expect(addedJob).not.toBeNull();
    expect(addedJob?.name).toBe('conditional');
    if (addedJob) {
      await addedJob.remove();
    }
  });

  test('should throw error for unsupported node type', async () => {
    const journeyWithUnknownNode = {
      ...mockJourney,
      nodes: [{ id: 'node-4', type: 'UNKNOWN' }],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journeyWithUnknownNode);
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-4',
      patientContext: { id: 'patient-4', age: 60, language: 'es', condition: 'hip_replacement' },
    };
    await expect(addJob(job)).rejects.toThrow("Unsupported node type 'UNKNOWN' for node ID node-4");
  });
});

describe('getJobStatus', () => {
  test('should return null if job does not exist', async () => {
    const queue = createQueue('journey');
    const status = await getJobStatus('non-existent-job-id');
    expect(status).toBeNull();
  });

  test('should return job status if job exists', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    const job: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-1',
      patientContext: { id: 'patient-5', age: 70, language: 'en', condition: 'hip_replacement' },
    };
    const jobId = await addJob(job);
    const status = await getJobStatus(jobId);
    expect(typeof status).toBe('string');
    
    const queue = createQueue('journey');
    const addedJob = await queue.getJob(jobId);
    if (addedJob) {
      await addedJob.remove();
    }
  });
});