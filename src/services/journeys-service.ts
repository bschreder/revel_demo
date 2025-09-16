import { Journey } from '#src/models/node-types.js';
import { createJourney } from '#src/db/mongodb-interface.js';

/**
 * Saves a journey to the database.
 * @param journey Journey object to save
 */
export async function saveJourney(journey: Journey): Promise<void> {
  await createJourney(journey);
}