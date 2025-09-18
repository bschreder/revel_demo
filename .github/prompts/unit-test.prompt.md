# Unit Test Refactor Prompt

## Objective

Refactor all unit test files matching the pattern `./tests/**/*.test.ts` to ensure they follow best practices and are robust, isolated, and maintainable.

## Instructions

1. **Fix All Broken Tests**
   - Identify and fix any failing or broken tests.
   - Ensure all tests pass reliably and consistently.

2. **Create New Tests Where Needed**
   - Identify any missing test coverage for critical functions or modules.
   - Add new unit tests to cover untested code paths, edge cases, and error handling.
   - Follow current project conventions for test structure and naming.

3. **Missing Application Functionality**
   - If any critical application functionality is missing, write a brief description of the missing functionality into the `./docs/MISSING-FUNCTIONALITY.md` file.
   - After documenting the missing functionality, create new unit tests to cover the gaps and continue working on the rest of the tests.

4. **Use In-Memory MongoDB**
   - Replace any real MongoDB connections with [MongoMemoryServer](https://github.com/nodkz/mongodb-memory-server) for all unit tests.
   - Ensure each test suite spins up and tears down its own in-memory MongoDB instance.
   - Clean up all data between tests to avoid cross-test contamination.

5. **Mock BullMQ Queue**
   - Mock the BullMQ `Queue` and related classes to prevent real Redis connections and job processing.
   - Use Jest's mocking capabilities (`jest.mock`) to stub all BullMQ interactions.
   - Ensure no real jobs are enqueued or processed during unit tests.

6. **Jest Best Practices**
   - Use `describe` and `test` blocks for clear test structure.
   - Use the Arrange-Act-Assert pattern (do not include comments for these sections).
   - Mock all external dependencies (APIs, DB, queues, etc.).
   - Use `beforeAll`, `beforeEach`, `afterEach`, and `afterAll` for setup/teardown.
   - Use TypeScript for all test files.
   - Ensure high code coverage (aim for 90%+).
   - Use clear, descriptive test names.
   - Avoid testing implementation details; focus on observable behavior.
   - Clean up all mocks and resources after each test.

7. **File Update Scope**
   - Only update files matching `./tests/**/*.test.ts`.
   - Do not modify source files or integration tests.

8. **Additional Best Practices**
   - Use `jest.clearAllMocks()` and `jest.resetAllMocks()` as appropriate.
   - Prefer `async/await` for asynchronous tests.
   - Use `fetch` for HTTP endpoint tests, but only if mocking the server.
   - Add missing JSDoc comments for exported test utilities.
   - Ensure all test data is generated dynamically or via factories.

## Acceptance Criteria

- All unit tests pass and are reliable.
- No real MongoDB or Redis connections are made during unit tests.
- All BullMQ interactions are mocked.
- Code coverage is at least 90% for all tested modules.
- Only files in `./tests/**/*.test.ts` are updated.
- All tests follow Jest and TypeScript best practices.
