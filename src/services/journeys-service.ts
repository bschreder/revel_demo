import { Journey, PatientContext } from '#src/models/node-types.js';
import { createJourney, getJourneyById } from '#src/db/mongodb-interface.js';
import { randomUUID } from 'crypto';
import { JobNode, JobNodeResponseSchema } from '#src/models/journey-schema.js';
import { addJob, getJobStatus } from '#src/executor/job.js';
import { createRunTrace } from '#src/db/mongodb-interface.js';


/**
 * Saves a journey to the database.
 * @param {Journey} journey Journey object to save
 * @returns {Promise<void>} Promise that resolves when the journey is saved
 */
export async function saveJourney(journey: Journey): Promise<void> {
  const j = await createJourney(journey);
  console.log(`Created journey with ID: ${j.id}`);
}

/**
 * Starts a new execution run of a journey for a patient.
 * @param {string} journeyId The journey to trigger
 * @param {PatientContext} patient PatientContext for the run
 * @returns {Promise<string>} The runId (uuid) of the new execution
 */
export async function triggerJourneyService(journeyId: string, patient: PatientContext): Promise<string> {
  // find the journey by id
  const journey = await getJourneyById(journeyId);
  if (!journey) {
    throw new Error('Journey not found');
  }

  // Create a new run record
  const runId = randomUUID();
  const runsNode: JobNode = {
    runId,
    journeyId: journey.id,
    currentNodeId: journey.start_node_id,
    patientContext: patient
  };

  /**
  * Create initial run trace
  * @param {string} runId The ID of the journey run
  * @param {string} journeyId The ID of the journey
  * @param {PatientContext} patientContext The patient context
  * @param {string | null} currentNodeId The current node ID
  * @returns {Promise<void>}  Promise that resolves when the trace is created
  */
  await createRunTrace({ runId, journeyId: journey.id, patientContext: patient, currentNodeId: journey.start_node_id });

  // Submit journey to queue for execution
  const jobId = await addJob(runsNode);
  console.log(`Added job with ID: ${jobId}`);

  return runId;
}

/**
 * Fetches a journey run by its runId.
 * @param {string} runId The runId of the journey run
 * @returns {Promise<JobNodeResponseSchema | null>} The journey run status response or null if not found
 */
export async function getJourneyRunById(runId: string): Promise<JobNodeResponseSchema | null> {
  return getJobStatus(runId);
}