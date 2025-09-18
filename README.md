# Journey Processing

## Assumptions:

- All journeys are self contained => one journey will not call the node in another journey
- A journey starts, first node processed, when inserted into the mongodb

## BullMQ Queue & Worker (src/executor)

This project includes a production-ready BullMQ queue and worker for background job processing using Redis.

### Setup

1. Ensure Redis is running (see `containers/docker-compose.yml` for local setup).
2. Set the following environment variables (or add to your `.env` file):
   - `REDIS_HOST` (default: `localhost`)
   - `REDIS_PORT` (default: `6379`)
   - `REDIS_USERNAME` (optional)
   - `REDIS_PASSWORD` (optional)
   - `REDIS_DB` (default: `0`)
   - `BULLMQ_QUEUE_NAME` (default: `default`)

### Usage Example

To add and process jobs:

```
pnpm install # or npm install
pnpm tsx src/executor/run-example.ts # or npx tsx src/executor/run-example.ts
```

This will:

- Start a BullMQ worker
- Add an example job to the queue
- Log job lifecycle events (completed, failed, progress, etc.)

### Source Files

- `src/executor/queue.ts`: Queue creation
- `src/executor/worker.ts`: Worker and event listeners
- `src/executor/redis-config.ts`: Redis config from env
- `src/executor/example-job.ts`: Example job adder
- `src/executor/example-processor.ts`: Example processor
- `src/executor/run-example.ts`: Minimal usage example

### Testing

Unit tests are in `tests/features/executor/`. Run:

```
npx jest tests/features/executor/ --detectOpenHandles --forceExit
```

### Notes

- All code is TypeScript and ESM.
- Logging uses `pino`.
- All public APIs are documented with JSDoc.
