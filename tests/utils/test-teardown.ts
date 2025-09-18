import type { FastifyInstance } from 'fastify';
import { stopWorker } from '#src/executor/worker.js';
import { closeQueue } from '#src/executor/queue.js';
import { disconnect } from '#src/db/mongodb-interface.js';

/**
 * Gracefully shuts down test infrastructure to avoid open handles:
 * - Stops BullMQ worker
 * - Closes BullMQ queue
 * - Closes Fastify server
 * - Disconnects Mongo
 */
export async function teardownTestInfra(app?: FastifyInstance): Promise<void> {
  try { await stopWorker(); } catch { /* noop */ }
  
  try { await closeQueue(); } catch { /* noop */ }

  if (app) {
    try { await app.close(); } catch { /* noop */ }
  }

  try { await disconnect(); } catch { /* noop */ }
}
