import { actionProcessor, delayProcessor, conditionalProcessor } from '#src/executor/processor.js';
import { Job } from 'bullmq';
import { getJourneyById } from '#src/db/mongodb-interface.js';
import { addJob } from '#src/executor/job.js';

jest.mock('#src/db/mongodb-interface.js');
jest.mock('#src/executor/job.js');

const mockPatientContext = {
  id: 'patient-1',
  age: 30,
  language: 'en',
  condition: 'hip_replacement',
};

const mockJourney = {
  id: 'journey-1',
  nodes: [
    { id: 'node-1', type: 'MESSAGE', message: 'Hello', next_node_id: 'node-2' },
    { id: 'node-2', type: 'DELAY', duration_seconds: 5, next_node_id: 'node-3' },
    { id: 'node-3', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '>', value: 18 }, on_true_next_node_id: null, on_false_next_node_id: null },
  ],
};

describe('processor.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getJourneyById as jest.Mock).mockResolvedValue(mockJourney);
    (addJob as jest.Mock).mockResolvedValue('mock-job-id');
  });

  test('actionProcessor processes action node and submits next job', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'node-1', patientContext: mockPatientContext } } as Job;
    const result = await actionProcessor(job);
    expect(result).toContain('Processed action job');
    expect(addJob).toHaveBeenCalledWith({
      journeyId: 'journey-1',
      currentNodeId: 'node-2',
      patientContext: mockPatientContext,
    });
  });

  test('delayProcessor processes delay node and submits next job', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'node-2', patientContext: mockPatientContext } } as Job;
    const result = await delayProcessor(job);
    expect(result).toContain('Processed delay job');
    expect(addJob).toHaveBeenCalledWith({
      journeyId: 'journey-1',
      currentNodeId: 'node-3',
      patientContext: mockPatientContext,
    });
  });

  test('conditionalProcessor processes conditional node and completes journey if true', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'node-3', patientContext: { ...mockPatientContext, age: 30 } } } as Job;
    const result = await conditionalProcessor(job);
    expect(result).toContain('completed for patient');
    expect(addJob).not.toHaveBeenCalled();
  });

  test('actionProcessor throws if journey not found', async () => {
    (getJourneyById as jest.Mock).mockResolvedValue(null);
    const job = { data: { journeyId: 'not-found', currentNodeId: 'node-1', patientContext: mockPatientContext } } as Job;
    await expect(actionProcessor(job)).rejects.toThrow('Journey with ID not-found not found');
  });

  test('delayProcessor throws if node not found', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'missing-node', patientContext: mockPatientContext } } as Job;
    await expect(delayProcessor(job)).rejects.toThrow('Node with ID missing-node not found or wrong type');
  });

  test('conditionalProcessor throws for unsupported operator', async () => {
    const journey = {
      ...mockJourney,
      nodes: [
        ...mockJourney.nodes,
        { id: 'node-4', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '??', value: 18 }, on_true_next_node_id: null, on_false_next_node_id: null },
      ],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journey);
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'node-4', patientContext: mockPatientContext } } as Job;
    await expect(conditionalProcessor(job)).rejects.toThrow('Unsupported operator: ??');
  });
});

// Additional branch coverage merged from processor-more.test.ts
const baseJourney = {
  id: 'journey-1',
  nodes: [
    { id: 'a1', type: 'MESSAGE', message: 'Hello', next_node_id: null },
    { id: 'd1', type: 'DELAY', duration_seconds: 1, next_node_id: null },
    { id: 'c1', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '=', value: 30 }, on_true_next_node_id: null, on_false_next_node_id: null },
    { id: 'c2', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '!=', value: 30 }, on_true_next_node_id: 'a1', on_false_next_node_id: 'd1' },
    { id: 'c3', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '<', value: 40 }, on_true_next_node_id: 'a1', on_false_next_node_id: 'd1' },
  ],
};

describe('processor more branches (merged)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getJourneyById as jest.Mock).mockResolvedValue(baseJourney);
    (addJob as jest.Mock).mockResolvedValue('job-x');
  });

  test('actionProcessor completes when no next_node_id', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'a1', patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip' } } } as unknown as Job;
    const res = await actionProcessor(job);
    expect(res).toMatch(/completed for patient/);
    expect(addJob).not.toHaveBeenCalled();
  });

  test('delayProcessor completes when no next_node_id', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'd1', patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip' } } } as unknown as Job;
    const res = await delayProcessor(job);
    expect(res).toMatch(/completed for patient/);
    expect(addJob).not.toHaveBeenCalled();
  });

  test('conditionalProcessor operator = true path completes when no next', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'c1', patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip' } } } as unknown as Job;
    const res = await conditionalProcessor(job);
    expect(res).toMatch(/completed for patient/);
    expect(addJob).not.toHaveBeenCalled();
  });

  test('conditionalProcessor operator != uses true/false next ids', async () => {
    const jobTrue = { data: { journeyId: 'journey-1', currentNodeId: 'c2', patientContext: { id: 'p1', age: 31, language: 'en', condition: 'hip' } } } as unknown as Job;
    await conditionalProcessor(jobTrue);
    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ currentNodeId: 'a1' }));

    jest.clearAllMocks();
    (addJob as jest.Mock).mockResolvedValue('job-y');
    const jobFalse = { data: { journeyId: 'journey-1', currentNodeId: 'c2', patientContext: { id: 'p1', age: 30, language: 'en', condition: 'hip' } } } as unknown as Job;
    await conditionalProcessor(jobFalse);
    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ currentNodeId: 'd1' }));
  });

  test('conditionalProcessor operator < true path', async () => {
    const job = { data: { journeyId: 'journey-1', currentNodeId: 'c3', patientContext: { id: 'p1', age: 20, language: 'en', condition: 'hip' } } } as unknown as Job;
    await conditionalProcessor(job);
    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ currentNodeId: 'a1' }));
  });
});
