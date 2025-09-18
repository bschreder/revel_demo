import { Journey } from '#src/models/node-types.js';
import { JourneyModel, RunTraceModel } from './mongodb-schema.js';
import type { ConnectOptions } from 'mongoose';
import mongoose from 'mongoose';
import { ExecutionStep, RunTraceResponse } from '#src/models/trace-schema.js';


/**
 * Connect to MongoDB using environment variables.
 * @param {ConnectOptions} optionParams Optional mongoose ConnectOptions to override defaults
 * @returns {Promise<typeof mongoose>} Promise that resolves to the mongoose instance
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
 * @returns {void} Promise that resolves when disconnected
 */
export function disconnect(): Promise<void> {
  return mongoose.disconnect();
}

/**
 * Create a new journey document.
 * @param journey Journey object to create
 * @returns {Promise<Journey>} Created journey
 */
export async function createJourney(journey: Journey): Promise<Journey> {
  const doc = new JourneyModel(journey);
  await doc.save();
  return doc.toObject() as unknown as Journey;
}

/**
 * Get a journey by its id.
 * @param {string} id Journey id
 */
export async function getJourneyById(id: string): Promise<Journey | null> {
  return (await JourneyModel.findOne({ id }).lean()) as Journey | null;
}

/**
 * Update a journey by its id.
 * @param {string} id Journey id
 * @param {Partial<Journey>}  update Partial journey object
 * @returns {Promise<Journey | null>} Updated journey or null if not found
 */
export async function updateJourney(id: string, update: Partial<Journey>): Promise<Journey | null> {
  return (await JourneyModel.findOneAndUpdate({ id }, update, { new: true }).lean()) as Journey | null;
}

/**
 * Delete a journey by its id.
 * @param {string} id Journey id
 * @returns {Promise<boolean>} True if deleted, false otherwise 
 */
export async function deleteJourney(id: string): Promise<boolean> {
  const result = await JourneyModel.deleteOne({ id });
  return result.deletedCount === 1;
}

/**
 * List all journeys.
 * @returns {Promise<Journey[]>} Array of journeys
 */
export async function listJourneys(): Promise<Journey[]> {
  return (await JourneyModel.find().lean()) as unknown as Journey[];
}

/**
 * Trace operations
 * @param {Object} params Parameters for creating a run trace
 * @returns {Promise<void>}
 */
export async function createRunTrace(params: {
  runId: string;
  journeyId: string;
  patientContext: any;
  currentNodeId?: string | null;
}): Promise<void> {
  await RunTraceModel.create({
    runId: params.runId,
    journeyId: params.journeyId,
    status: 'in_progress',
    startedAt: new Date(),
    finishedAt: null,
    currentNodeId: params.currentNodeId || null,
    patientContext: params.patientContext,
    steps: []
  });
}

/**
 * Begins a new trace step for a journey run.
 * @param {string} runId The ID of the journey run
 * @param {Omit<ExecutionStep, 'finishedAt'> & { finishedAt?: string | null }} step The step to begin
 * @returns {Promise<void>}
 */
export async function beginTraceStep(runId: string, step: Omit<ExecutionStep, 'finishedAt'> & { finishedAt?: string | null }): Promise<void> {
  await RunTraceModel.updateOne(
    { runId },
    {
      $push: {
        steps: {
          nodeId: step.nodeId,
          type: step.type,
          startedAt: new Date(step.startedAt),
          finishedAt: null,
        }
      },
      $set: { currentNodeId: step.nodeId }
    }
  );
}

/**
 * Finishes a trace step for a journey run.
 * @param {string} runId The ID of the journey run
 * @param {string} nodeId The ID of the node to finish
 * @param {any} result The result of the step
 */
export async function finishTraceStep(runId: string, nodeId: string, result?: any): Promise<void> {
  await RunTraceModel.updateOne(
    { runId, 'steps.nodeId': nodeId },
    {
      $set: {
        'steps.$.finishedAt': new Date(),
        'steps.$.result': result || null
      }
    }
  );
}

/**
 * Completes a run trace.
 * @param {string} runId The ID of the journey run
 * @param {('completed' | 'failed')} status The status to set
 * @returns {Promise<void>}
 */
export async function completeRunTrace(runId: string, status: 'completed' | 'failed'): Promise<void> {
  await RunTraceModel.updateOne({ runId }, { $set: { status, finishedAt: new Date() } });
}

/**
 * Get a run trace by its ID.
 * @param {string} runId The ID of the journey run
 * @returns {Promise<RunTraceResponse | null>}
 */
export async function getRunTrace(runId: string): Promise<RunTraceResponse | null> {
  // Provide explicit generic type to lean() to avoid ambiguous array/document union types
  const doc = await RunTraceModel.findOne({ runId }).lean<{
    runId: string;
    journeyId: string;
    status: 'in_progress' | 'completed' | 'failed';
    startedAt: Date;
    finishedAt?: Date | null;
    currentNodeId?: string | null;
    patientContext: any;
    steps: Array<{
      nodeId: string;
      type: 'MESSAGE' | 'DELAY' | 'CONDITIONAL';
      startedAt: Date;
      finishedAt?: Date | null;
      result?: any;
    }>;
  }>();
  if (!doc) {return null;}
  return {
    runId: doc.runId,
    journeyId: doc.journeyId,
    status: doc.status,
    startedAt: doc.startedAt.toISOString(),
    finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
    currentNodeId: doc.currentNodeId || null,
    patientContext: doc.patientContext,
    steps: (doc.steps || []).map((s: any) => ({
      nodeId: s.nodeId,
      type: s.type,
      startedAt: s.startedAt?.toISOString?.() || new Date(s.startedAt).toISOString(),
      finishedAt: s.finishedAt ? (s.finishedAt?.toISOString?.() || new Date(s.finishedAt).toISOString()) : null,
      result: s.result
    }))
  };
}
