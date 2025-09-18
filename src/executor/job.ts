import { getQueue } from './queue.js';
import { JobNode, JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { getJourneyById } from '#src/db/mongodb-interface.js';
import { DelayNode } from '#src/models/node-types.js';
import { getRunTrace } from '#src/db/mongodb-interface.js';



export type JobName = 'action' | 'delay' | 'conditional';

/**
 * Adds a job to the BullMQ queue with a specific job name.
 * @param {JobNode} data The job data
 * @returns {Promise<string>} The job ID
 */
export async function addJob(data: JobNode): Promise<string> {
  const queue = getQueue();
  const { currentNodeId, journeyId } = data;
  if (!currentNodeId || !journeyId) {
    throw new Error('Invalid job data: missing currentNodeId or journeyId');
  }
  const journey = await getJourneyById(journeyId);
  if (!journey) {
    throw new Error(`Journey with ID ${journeyId} not found`);
  }
  const node = journey.nodes.find((n) => n.id === currentNodeId);
  if (!node) {
    throw new Error(`Node with ID ${currentNodeId} not found in journey ${journeyId}`);
  }

  let jobName: JobName;
  let jobOptions = undefined;
  switch (node.type) {
  case 'MESSAGE':
    jobName = 'action';
    break;
  case 'DELAY':
    jobName = 'delay';
    jobOptions = { delay: (node as DelayNode).duration_seconds * 1000 };
    break;
  case 'CONDITIONAL':
    jobName = 'conditional';
    break;
  default:
    throw new Error(`Unsupported node type '${(node as any).type}' for node ID ${currentNodeId}`);
  }

  const job = await queue.add(jobName, data, jobOptions);
  return job.id as string;
}


/**
 * Fetches the status of a job in the queue by runId (jobId).
 * @param {string} runId The BullMQ job id
 * @returns {Promise<JobNodeResponseSchema | null>} The job status payload or null if not found
 */
export async function getJobStatus(runId: string): Promise<JobNodeResponseSchema | null> {
  const trace = await getRunTrace(runId);
  if (!trace) {return null;}
  const jobStatus: JobNodeResponseSchema = {
    runId,
    status: trace.status,
    journeyId: trace.journeyId,
    currentNodeId: trace.currentNodeId || '',
    patientContext: trace.patientContext
  };
  return jobStatus;
}
