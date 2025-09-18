# Journey Processing

## Assumptions:

- All journeys are self contained => one journey will not call the node in another journey
- A journey starts when trigger endpoint is called

## Architecture and Structure

### Key Technologies

### Folder Structure

## Usage

1. Ensure MongoDb and Redis is running (see `containers/docker-compose.yml` for local setup).
2. Set the following environment variables (or add to your `.env` file):
   - `REDIS_HOST` (default: `localhost`)
   - `REDIS_PORT` (default: `6379`)
   - `REDIS_USERNAME` (optional)
   - `REDIS_PASSWORD` (optional)
   - `REDIS_DB` (default: `0`)
   - `BULLMQ_QUEUE_NAME` (default: `default`)

## Testing

Run all tests (unit + integration) in CI mode:

```
npm run test:ci
```

Run unit tests:

```
npm run test:unit
```

Run integration tests:

```
npm run test:integration
```

Run end-to-end journey tests:

```
npm run test:e2e
```

### Running Integration Tests

Integration tests use real MongoDB and Redis instances. Make sure local services are up and reachable.

1. Start dependencies (MongoDB and Redis). For local development, you can use the compose file in `containers/docker-compose.yml`.
   1. to start: `docker compose up -d`
   2. to shutdown: `docker compose down --remove-orphans -v`
2. Optionally set environment variables (defaults are used if not set):
   - `MONGODB_HOST` (default: `localhost`)
   - `MONGODB_PORT` (default: `27017`)
   - `MONGODB_DATABASE` (default: `revelai-test`)
   - `REDIS_HOST` (default: `localhost`)
   - `REDIS_PORT` (default: `6379`)

Notes:

- Integration tests automatically use per-worker HTTP ports and test-specific BullMQ queue names to avoid conflicts.
- By default, the test MongoDB database name is `revelai-test`.

## Notes

- All code is TypeScript and ESM.
- Logging uses `pino`.
- All public APIs are documented with JSDoc.
