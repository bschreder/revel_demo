import dotenv from 'dotenv';
import { startServer } from './server.js';
import { connect, isConnected, disconnect } from './db/mongodb-interface.js';


dotenv.config();

const PORT = process.env.FASTIFY_PORT ? parseInt(process.env.FASTIFY_PORT, 10) : 5000;

async function main(): Promise<void> {
  console.log('[main] Starting application...');
  if (!isConnected()) {
    console.log('[main] Not connected to MongoDB, connecting...');
    await connect();
    console.log('[main] Connected to MongoDB');
  } else {
    console.log('[main] Already connected to MongoDB');
  }
  console.log(`[main] Starting Fastify server on port ${PORT}...`);
  const fastify = await startServer(PORT);
  console.log('[main] Fastify server started');

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('[main] Shutdown signal received, closing server and disconnecting from MongoDB...');
    await fastify.close();
    await disconnect();
    console.log('[main] Shutdown complete. Exiting process.');
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


