import dotenv from 'dotenv';
import { FastifyInstance } from 'fastify';
import { startServer } from '#src/server.js';
import { connect, isConnected, disconnect } from '#src/db/mongodb-interface.js';
import { ConnectOptions } from 'mongoose';

describe('GET /journeys/runs/:runId (integration)', () => {
	let fastifyInstance: FastifyInstance;
	const dbName = 'revelai-test';
	const connectOptions: ConnectOptions = { dbName: dbName, autoIndex: false };

	beforeAll(async () => {
		if (!isConnected()) {
			dotenv.config();
			await connect(connectOptions);
		}
		fastifyInstance = await startServer();
	});

	afterAll(async () => {
		await fastifyInstance.close();
		await disconnect();
	});

	test('should return 200 and run status for a valid runId', async () => {
		// First, create a journey
		const journey = {
			id: '',
			name: 'Integration Journey',
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
		const journeyRes = await fetch('http://localhost:5000/journeys', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(journey)
		});
		expect(journeyRes.status).toBe(201);
		const { journeyId } = await journeyRes.json() as { journeyId: string };

		// Trigger the journey to get a runId
		const triggerRes = await fetch(`http://localhost:5000/journeys/${journeyId}/trigger`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				patient: {
					id: 'patient-001',
					age: 67,
					language: 'en',
					condition: 'hip_replacement'
				}
			})
		});
		expect(triggerRes.status).toBe(202);
		const { runId } = await triggerRes.json() as { runId: string };
		expect(typeof runId).toBe('string');

		// Now, fetch the run status
		const runRes = await fetch(`http://localhost:5000/journeys/runs/${runId}`);
		expect(runRes.status).toBe(200);
		const runData = await runRes.json();
		expect(runData).toHaveProperty('runId', runId);
		expect(runData).toHaveProperty('status');
		expect(runData).toHaveProperty('currentNodeId');
		expect(runData).toHaveProperty('patientContext');
	});

	test('should return 404 for a non-existent runId', async () => {
		const res = await fetch('http://localhost:5000/journeys/runs/notfound');
		expect(res.status).toBe(404);
		const data = await res.json();
		expect(data).toEqual({ error: 'Run not found' });
	});
});
