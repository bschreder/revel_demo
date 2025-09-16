import { Journey } from '#src/models/node-types.js';
import { JourneyModel } from './mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import mongoose from 'mongoose';


/**
 * Connect to MongoDB using environment variables.
 */
export async function connect(optionParams?: ConnectOptions): Promise<typeof mongoose> {
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const user = process.env.MONGODB_USER || '';
  const password = process.env.MONGODB_PASSWORD || '';
  const db = optionParams?.dbName || process.env.MONGODB_DATABASE;

  const uri = `mongodb://${host}:${port}`;

  const options = {
    ...optionParams,
    authSource: 'admin',
    user: user,
    pass: password,
    dbName: db,
    autoIndex: false
  };
  return mongoose.connect(uri, options);
}

/**
 * Check if mongoose is connected to the database.
 * @returns {boolean} True if connected, false otherwise
 */
export function isConnected(): boolean {
  // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
  return mongoose.connection.readyState === 1;
}

/**
 * Disconnect from MongoDB.
 * @returns Promise that resolves when disconnected
 */
export function disconnect(): Promise<void> {
  return mongoose.disconnect();
}

/**
 * Create a new journey document.
 * @param journey Journey object to create
 */
export async function createJourney(journey: Journey): Promise<Journey> {
  const doc = new JourneyModel(journey);
  await doc.save();
  return doc.toObject() as unknown as Journey;
}

/**
 * Get a journey by its id.
 * @param id Journey id
 */
export async function getJourneyById(id: string): Promise<Journey | null> {
  return (await JourneyModel.findOne({ id }).lean()) as Journey | null;
}

/**
 * Update a journey by its id.
 * @param id Journey id
 * @param update Partial journey object
 */
export async function updateJourney(id: string, update: Partial<Journey>): Promise<Journey | null> {
  return (await JourneyModel.findOneAndUpdate({ id }, update, { new: true }).lean()) as Journey | null;
}

/**
 * Delete a journey by its id.
 * @param id Journey id
 */
export async function deleteJourney(id: string): Promise<boolean> {
  const result = await JourneyModel.deleteOne({ id });
  return result.deletedCount === 1;
}

/**
 * List all journeys.
 */
export async function listJourneys(): Promise<Journey[]> {
  return (await JourneyModel.find().lean()) as unknown as Journey[];
}
