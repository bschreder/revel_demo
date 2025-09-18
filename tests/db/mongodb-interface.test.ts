import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { isConnected,  disconnect, createJourney,
  getJourneyById, updateJourney, deleteJourney, listJourneys } from '#src/db/mongodb-interface.js';
import type { Journey } from '#src/models/node-types.js';

describe('mongodb-interface', () => {
  let mongoServer: MongoMemoryServer;
  const testJourney: Journey = {
    id: 'test-journey-1',
    name: 'Test Journey',
    start_node_id: 'node1',
    nodes: [
      {
        id: 'node1',
        type: 'MESSAGE',
        message: 'Hello!',
        next_node_id: null
      }
    ]
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { dbName: 'testdb' });
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up all journeys after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  test('connect establishes a connection', async () => {
    expect(isConnected()).toBe(true);
  });

  test('isConnected returns true when connected and false after disconnect', async () => {
    expect(isConnected()).toBe(true);
    await disconnect();
    expect(isConnected()).toBe(false);
    // Reconnect for other tests
    await mongoose.connect(mongoServer.getUri(), { dbName: 'testdb' });
  });

  test('disconnect closes the connection', async () => {
    await disconnect();
    expect(isConnected()).toBe(false);
    await mongoose.connect(mongoServer.getUri(), { dbName: 'testdb' });
  });

  test('createJourney creates and returns a journey', async () => {
    const created = await createJourney(testJourney);
    expect(created).toMatchObject(testJourney);
  });

  test('getJourneyById returns the journey if found', async () => {
    await createJourney(testJourney);
    const found = await getJourneyById(testJourney.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(testJourney.id);
  });

  test('getJourneyById returns null if not found', async () => {
    const found = await getJourneyById('nonexistent-id');
    expect(found).toBeNull();
  });

  test('updateJourney updates and returns the journey', async () => {
    await createJourney(testJourney);
    const updated = await updateJourney(testJourney.id, { name: 'Updated Name' });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Updated Name');
  });

  test('updateJourney returns null if journey does not exist', async () => {
    const updated = await updateJourney('nonexistent-id', { name: 'Nope' });
    expect(updated).toBeNull();
  });

  test('deleteJourney deletes the journey and returns true', async () => {
    await createJourney(testJourney);
    const deleted = await deleteJourney(testJourney.id);
    expect(deleted).toBe(true);
    const found = await getJourneyById(testJourney.id);
    expect(found).toBeNull();
  });

  test('deleteJourney returns false if journey does not exist', async () => {
    const deleted = await deleteJourney('nonexistent-id');
    expect(deleted).toBe(false);
  });

  test('listJourneys returns all journeys', async () => {
    const journey2: Journey = { ...testJourney, id: 'test-journey-2', name: 'Journey 2' };
    await createJourney(testJourney);
    await createJourney(journey2);
    const journeys = await listJourneys();
    expect(journeys).toHaveLength(2);
    const ids = journeys.map(j => j.id);
    expect(ids).toContain(testJourney.id);
    expect(ids).toContain(journey2.id);
  });
});
