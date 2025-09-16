import dotenv from 'dotenv';
import { getJourneyById, connect, isConnected } from '#src/db/mongodb-interface.js';
import { JourneyModel } from '#src/db/mongodb-schema.js';
import mongoose, { ConnectOptions } from 'mongoose';
import type { Journey } from '#src/models/node-types.js';

const dbName = 'revelai-test';
const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };

describe('MongoDB Interface Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!isConnected()) {
      dotenv.config();
      await connect(connectOptions);
    }

    await JourneyModel.deleteMany({}); // Clean up before tests
  });

  afterAll(async () => {
    await JourneyModel.deleteMany({}); // Clean up after tests
    await mongoose.disconnect();
  });

  test('getJourneyById returns journey when found', async () => {
    const fakeJourney: Journey = {
      id: 'abc123',
      name: 'Test Journey',
      start_node_id: 'node1',
      nodes: []
    };
    await JourneyModel.create(fakeJourney);
    const result = await getJourneyById('abc123');
    expect(result).toEqual(expect.objectContaining(fakeJourney));
  });

  test('getJourneyById returns null when not found', async () => {
    // Ensure no journey with this id exists
    await JourneyModel.deleteOne({ id: 'notfound' });
    const result = await getJourneyById('notfound');
    expect(result).toBeNull();
  });

  test('connect calls mongoose.connect with correct URI and options', async () => {
    // Disconnect first to test connect
    await mongoose.disconnect();
    const result = await connect(connectOptions);
    expect(result).toBeInstanceOf(mongoose.Mongoose);
    // Validate connection to correct DB
    expect(mongoose.connection.name).toBe(dbName);
  });
});
