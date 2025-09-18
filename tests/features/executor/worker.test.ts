import { startWorker } from '#src/executor/worker.js';
import { createQueue } from '#src/executor/queue.js';
import { JobNode } from '#src/models/journey-schema.js';

describe('BullMQ Worker', () => {
  test.skip('should process jobs and emit events', async () => {
    const testJob: JobNode = {
      journeyId: 'journey-1',
      currentNodeId: 'node-1',
      patientContext: { id: 'patient-1', age: 30, language: 'en', condition: 'hip_replacement' },
    };

    const queue = createQueue('action');
    const processed: string[] = [];
    const worker = startWorker();

    await new Promise(async (resolve, reject) => {
      worker.on('completed', (completedJob) => {
        if (typeof completedJob.id === 'string') {
          processed.push(completedJob.id);
        }
        if (completedJob.id === job.id) resolve(undefined);
      });
      const job = await queue.add('test', testJob);
      // Set a timeout to fail the test if not completed in time
      setTimeout(() => reject(new Error('Job did not complete in time')), 25000);
    });

    // Check that the processed array contains the job id
    const jobs = await queue.getJobs(['completed']);
    jobs.forEach(j => {
      expect(processed).toContain(j.id);
    });

    // Cleanup
    const allJobs = await queue.getJobs(['completed', 'waiting', 'active', 'delayed', 'failed']);
    for (const j of allJobs) {
      await j.remove();
    }
    await worker.close();
  }, 30000);
});
