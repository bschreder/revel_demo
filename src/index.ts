import dotenv from 'dotenv';
import { startServer } from './server.js';
import { connect, isConnected, disconnect } from './db/mongodb-interface.js';
import { startWorker, stopWorker } from './executor/worker.js';
import { closeQueue, createQueue } from './executor/queue.js';


dotenv.config();

const PORT = process.env.FASTIFY_PORT ? parseInt(process.env.FASTIFY_PORT, 10) : 5000;

async function main(): Promise<void> {
  // Connect to MongoDB
  if (!isConnected()) {
    await connect();
  } 
  
  // Start the Fastify server
  const fastify = await startServer(PORT);

  // Start BullMQ worker
  createQueue();
  startWorker();

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    await fastify.close();
    await disconnect();
    await closeQueue();
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main()
  .then(() => {
    console.log(`[main] server started on port ${PORT}`);
  })
  .catch((err) => {
    console.error('[main] Fatal error:', err);
    process.exit(1);
  });


