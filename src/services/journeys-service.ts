
import { Journey, PatientContext, RunsNode } from '#src/models/node-types.js';
import { createJourney, getJourneyById } from '#src/db/mongodb-interface.js';
import { randomUUID } from 'crypto';
import { JobNode, JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { addJob, getJobStatus } from '#src/executor/job.js';


/**
 * Saves a journey to the database.
 * @param journey Journey object to save
 */
export async function saveJourney(journey: Journey): Promise<void> {
  const j = await createJourney(journey);
  console.log(`Created journey with ID: ${j.id}`);
}

/**
 * Starts a new execution run of a journey for a patient.
 * @param journeyId The journey to trigger
 * @param patient PatientContext for the run
 * @returns The runId (uuid) of the new execution
 */
export async function triggerJourneyService(journeyId: string, patient: PatientContext): Promise<string> {
  // find the journey by id
  const journey = await getJourneyById(journeyId);
  if (!journey) {
    throw new Error('Journey not found');
  }

  // Create a new run record
  const runsNode: JobNode = {
    journeyId: journey.id,
    currentNodeId: journey.start_node_id,
    patientContext: patient
  };

  // Submit journey to queue for execution
  const jobId = await addJob(runsNode);
  console.log(`Added job with ID: ${jobId}`);

  return jobId;
}

/**
 * Fetches a journey run by its runId.
 * @param runId The runId of the journey run
 * @returns The journey run status response or null if not found
 */
export async function getJourneyRunById(runId: string): Promise<JobNodeResponseSchema | null> {
  return getJobStatus(runId);
}