# E2E Execution Tests Prompt

## Objective

Add end-to-end execution integration tests that validate real journey execution through BullMQ workers using Redis and real MongoDB persistence. Focus on observable behavior via HTTP endpoints and job state, not implementation details.

## Scenarios To Implement

1. End-to-end worker processing (MESSAGE)
   - Start a BullMQ worker bound to a test queue name.
   - Create a journey with a single MESSAGE node.
   - Trigger the journey and capture runId.
   - Poll GET /journeys/runs/:runId until status becomes `completed`.
   - Assert the final response contains the correct runId, journeyId, currentNodeId, and patientContext.

2. DELAY node execution
   - Create a journey with a DELAY node (`duration_seconds: 1`) followed by a MESSAGE node.
   - Start worker and trigger the journey.
   - Assert initial run status is `in_progress`.
   - After ~1–2 seconds (with polling/backoff), assert that the job has completed and the state reflects the execution.

3. CONDITIONAL branching (true and false)
   - Create a journey with a CONDITIONAL node testing a simple patient field (e.g., age > 50) which routes to different next nodes.
   - Start worker and trigger twice with different patient contexts to exercise both branches.
   - For each trigger, assert the job completes and the next path taken matches the expected branch.

4. Trigger non-existent journey
   - POST /journeys/:journeyId/trigger with a random UUID not present in MongoDB.
   - Assert a 500 response with `{ error: 'Failed to trigger journey run' }` (matches current controller behavior on missing journey).

5. GET run state after processing completes
   - After MESSAGE-only journey completes, call GET /journeys/runs/:runId.
   - Assert response has status `completed` and expected fields.

6. Post, Trigger, Verify complete multi-node journey
   - Create two journeys with at least 6 nodes
     1. MESSAGE -> DELAY -> MESSAGE -> CONDITIONAL false path -> MESSAGE -> DELAY
     2. MESSAGE -> DELAY -> MESSAGE -> CONDITIONAL true path -> MESSAGE -> DELAY
   - Start worker and trigger the journey.
   - Poll GET /journeys/runs/:runId until status is `completed`.
   - Assert the final response contains correct runId, journeyId, currentNodeId, and patientContext.

## General Requirements

- Use real MongoDB and Redis via Docker (assume `docker compose up -d` has already been run).
- Use per-Jest-worker HTTP ports to avoid conflicts (e.g., `BASE_PORT + (JEST_WORKER_ID - 1)`).
- Use a test queue name with a `-test` suffix and per-worker uniqueness, e.g., `jobs-test-<JEST_WORKER_ID>`.
- Use TypeScript + Jest, async/await, and `fetch` for HTTP checks.
- Add tests under `tests/e2e/**` using the `.e2e.test.ts` suffix.
- Follow Arrange-Act-Assert without inline comments.

## Setup and Teardown

- MongoDB
  - Connect using a dedicated test DB (default: `revelai-test`) via `connect({ dbName })`.
  - Clean relevant collections (e.g., `JourneyModel.deleteMany({})`) between tests to avoid cross-test contamination.
  - Disconnect in `afterAll`.

- BullMQ
  - Set `process.env.BULLMQ_QUEUE_NAME = jobs-test-<JEST_WORKER_ID>` in `beforeAll`.
  - Start worker in `beforeAll` using the test queue name and stop it in `afterAll`.
  - Close the Queue with `closeQueue()` in teardown.

- Server
  - Start Fastify with a per-worker port (e.g., `startServer(PORT)`) in `beforeAll` and close it in `afterAll`.

- Timeouts and polling
  - Use reasonable Jest timeouts (e.g., 10–15s) for DELAY tests.
  - Implement simple polling with backoff (e.g., 100–300ms) to check GET /journeys/runs/:runId until `completed` or timeout.

## Environment Variables

- `MONGODB_HOST` (default: `localhost`)
- `MONGODB_PORT` (default: `27017`)
- `MONGODB_DATABASE` (default: `revelai-test`)
- `REDIS_HOST` (default: `localhost`)
- `REDIS_PORT` (default: `6379`)
- `BULLMQ_QUEUE_NAME` (set per-worker to `jobs-test-<JEST_WORKER_ID>`, inside test lifecycle)

## File Update Scope

- Only add or update files matching `./tests/e2e/*.e2e.test.ts`.
- Do not modify application source files.

## Naming Suggestions

- `tests/e2e/journeys-worker-message.e2e.test.ts`
- `tests/e2e/journeys-delay.e2e.test.ts`
- `tests/e2e/journeys-conditional.e2e.test.ts`
- `tests/e2e/journeys-trigger-missing.e2e.test.ts`
- `tests/e2e/journeys-run-completed.e2e.test.ts`

## Acceptance Criteria

- Tests run reliably with real MongoDB and Redis.
- Each suite uses a dedicated test DB and queue name with per-worker isolation.
- Worker is started and stopped properly in tests that require execution.
- Polling is robust enough to handle the DELAY case without flakiness.
- No cross-test contamination (DB and queues cleaned up appropriately).
- All new tests pass locally and in CI.
