# Integration Test Refactor Prompt

## Objective

Refactor all integration test files matching the pattern `./tests/**/*.integration.test.ts` to ensure they follow best practices for integration testing, using real MongoDB and BullMQ queue instances. Tests must be robust, isolated, and maintainable.

## Instructions

1. **Fix All Broken Integration Tests**
   - Identify and fix any failing or broken integration tests.
   - Ensure all integration tests pass reliably and consistently.

2. **Create New Integration Tests Where Needed**
   - Identify missing integration test coverage for critical flows, endpoints, or modules.
   - Add new integration tests to cover untested code paths, edge cases, and error handling.
   - Follow current project conventions for test structure and naming.

3. **Missing Application Functionality**
   - If any critical application functionality is missing, write a brief description of the missing functionality into the `./docs/MISSING-FUNCTIONALITY.md` file.
   - After documenting the missing functionality, create new integration tests to cover the gaps and continue working on the rest of the tests.

4. **Use Real MongoDB (with Test Database)**
   - Connect to a real MongoDB instance (e.g., via Docker) for all integration tests.
   - Use a dedicated test database with the `-test` suffix (e.g., `myapp-test`).
   - Ensure all test data is cleaned up between tests to avoid cross-test contamination.
   - Never connect to or modify production databases during testing.

5. **Use Real BullMQ Queue (with Test Queue Name)**
   - Connect to a real Redis instance (e.g., via Docker) for BullMQ.
   - Use a dedicated test queue with the `-test` suffix (e.g., `jobs-test`).
   - Ensure all jobs are processed and cleaned up between tests.
   - Never enqueue jobs to production queues during testing.

6. **Jest Best Practices for Integration Tests**
   - Use `describe` and `test` blocks for clear test structure.
   - Use the Arrange-Act-Assert pattern (do not include comments for these sections).
   - Use `beforeAll`, `beforeEach`, `afterEach`, and `afterAll` for setup/teardown.
   - Use TypeScript for all test files.
   - Ensure high code coverage (aim for 90%+).
   - Use clear, descriptive test names.
   - Avoid testing implementation details; focus on observable behavior.
   - Clean up all resources (DB, queues, jobs) after each test.

7. **File Update Scope**
   - Only update files matching `./tests/**/*.integration.test.ts`.
   - Do not modify source files or unit tests.

8. **Additional Best Practices**
   - Use environment variables to configure test DB and queue names (e.g., `MONGODB_DB=myapp-test`, `BULLMQ_QUEUE=jobs-test`).
   - Prefer `async/await` for asynchronous tests.
   - Use `fetch` for HTTP endpoint tests.
   - Add missing JSDoc comments for exported test utilities.
   - Ensure all test data is generated dynamically or via factories.
   - Assume that `docker compose up -d` has been run to start local MongoDB and Redis instances and they are available.

## Acceptance Criteria

- All integration tests pass and are reliable.
- Only test databases and queues with the `-test` suffix are used.
- No production data or queues are modified during testing.
- Code coverage is at least 90% for all tested modules.
- Only files in `./tests/**/*.integration.test.ts` are updated.
- All tests follow Jest and TypeScript best practices.
