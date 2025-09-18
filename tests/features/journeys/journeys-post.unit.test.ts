import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { postJourney } from '#src/controllers/journeys-controller.js';
import { Journey } from '#src/models/node-types.js';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('postJourney', () => {
  let mongoServer: MongoMemoryServer;
    type JourneyIdResponse = { journeyId: string };  

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, { dbName: 'testdb' });
    });

    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });

    afterEach(async () => {
    // Clean up all journeys after each test
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    });

    test('should create a journey and return journeyId', async () => {
      const journey: Journey = {
        id: '', // will be replaced in controller
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

      // Mock Fastify request and reply
      const request = { body: journey } as unknown as FastifyRequest;
      let statusCode: number | undefined;
      let responseBody: any;
      const reply = {
        code: (code: number) => {
          statusCode = code;
          return {
            send: (body: any) => {
              responseBody = body;
            }
          };
        }
      } as unknown as FastifyReply;

      await postJourney(request, reply);
      expect(statusCode).toBe(201);
      expect(responseBody).toHaveProperty('journeyId');
      expect(typeof responseBody.journeyId).toBe('string');
    
      // Optionally, check that the journey was actually saved
      const journeys = await mongoose.connection.collection('journeys').find({ id: responseBody.journeyId }).toArray();
      expect(journeys).toHaveLength(1);
      expect(journeys[0].name).toBe('Test Journey');
    });
});

// Merged 500 error path test from post-journey-error.test.ts
import { postJourney as postJourneyController } from '#src/controllers/journeys-controller.js';
import * as service from '#src/services/journeys-service.js';

describe('postJourney 500 error path (merged)', () => {
  test('returns 500 when service throws', async () => {
    jest.spyOn(service, 'saveJourney').mockRejectedValue(new Error('db down'));
    const request = {
      body: { id: '', name: 'J', start_node_id: 'n1', nodes: [] },
      log: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() }
    } as unknown as FastifyRequest;
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;
    await postJourneyController(request, reply);
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to create journey' });
  });
});
