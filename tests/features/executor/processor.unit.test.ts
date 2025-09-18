import { actionProcessor, delayProcessor, conditionalProcessor } from '#src/executor/processor.js';
import { Job } from 'bullmq';
import { getJourneyById, beginTraceStep, finishTraceStep, completeRunTrace } from '#src/db/mongodb-interface.js';
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

// Additional targeted coverage to increase branches/statements
describe('processor additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('conditionalProcessor supports == operator and enqueues next', async () => {
    const journey = {
      id: 'j-x',
      nodes: [
        { id: 'condEq', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '==', value: 42 }, on_true_next_node_id: 'nTrue', on_false_next_node_id: 'nFalse' },
        { id: 'nTrue', type: 'MESSAGE', message: 'T', next_node_id: null },
        { id: 'nFalse', type: 'DELAY', duration_seconds: 1, next_node_id: null },
      ],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journey);
    (addJob as jest.Mock).mockResolvedValue('job-1');

    const job = { data: { runId: 'run-1', journeyId: 'j-x', currentNodeId: 'condEq', patientContext: { id: 'p1', age: 42, language: 'en', condition: 'hip' } } } as unknown as Job;
    await conditionalProcessor(job);
    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ currentNodeId: 'nTrue', journeyId: 'j-x', runId: 'run-1' }));
  });

  test('conditionalProcessor < false path enqueues on_false_next_node_id', async () => {
    const journey = {
      id: 'j-y',
      nodes: [
        { id: 'condLt', type: 'CONDITIONAL', condition: { field: 'patient.age', operator: '<', value: 10 }, on_true_next_node_id: 'A', on_false_next_node_id: 'B' },
        { id: 'A', type: 'MESSAGE', message: 'A', next_node_id: null },
        { id: 'B', type: 'DELAY', duration_seconds: 2, next_node_id: null },
      ],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journey);
    (addJob as jest.Mock).mockResolvedValue('job-2');

    const job = { data: { runId: 'run-2', journeyId: 'j-y', currentNodeId: 'condLt', patientContext: { id: 'p2', age: 20, language: 'en', condition: 'hip' } } } as unknown as Job;
    await conditionalProcessor(job);
    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({ currentNodeId: 'B' }));
  });

  test('actionProcessor wrong node type throws type guard error', async () => {
    const journey = {
      id: 'j-z',
      nodes: [ { id: 'notAction', type: 'DELAY', duration_seconds: 1, next_node_id: null } ],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journey);
    const job = { data: { runId: 'r-3', journeyId: 'j-z', currentNodeId: 'notAction', patientContext: { id: 'p3', age: 50, language: 'en', condition: 'hip' } } } as unknown as Job;
    await expect(actionProcessor(job)).rejects.toThrow('not found or wrong type');
  });

  test('processors call trace helpers appropriately on complete', async () => {
    const journey = {
      id: 'j-t',
      nodes: [ { id: 'a1', type: 'MESSAGE', message: 'Hi', next_node_id: null } ],
    };
    (getJourneyById as jest.Mock).mockResolvedValue(journey);
    const job = { data: { runId: 'r-4', journeyId: 'j-t', currentNodeId: 'a1', patientContext: { id: 'p4', age: 60, language: 'en', condition: 'hip' } } } as unknown as Job;
    await actionProcessor(job);
    expect(beginTraceStep).toHaveBeenCalledWith('r-4', expect.objectContaining({ nodeId: 'a1', type: 'MESSAGE' }));
    expect(finishTraceStep).toHaveBeenCalledWith('r-4', 'a1', expect.any(Object));
    expect(completeRunTrace).toHaveBeenCalledWith('r-4', 'completed');
  });
});
