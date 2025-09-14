# Project Overview

This is a typescript nodejs application that has a RESTful API using Fastify, a standalone MongoDB database, a lightweight bullmq queue with a standalone Redis instance. MongoDB (port: 27017) and Redis (port: 6379) are locally running in docker containers.
The project is built by a staff engineer use best nodejs and npm practices.

## Naming and Style Conventions

- **Variables and Functions:** Use `camelCase`.
- **Classes and Interfaces:** Use `PascalCase`.
- **Constants:** Use `UPPER_SNAKE_CASE` for global, top-level constants.
- **Indentation:** 2 spaces.
- **String Literals:** Use single quotes `' '`.
- **Asynchronous Code:** Prefer `async/await` over callbacks or `.then()` chains.
- **File Naming:** Use `kebab-case` for file and directory names (e.g., `user-service.ts`, `auth-middleware.ts`).

## Preferred Technologies

- Use `fetch` for all API calls; do not use libraries like `axios`.
- Use mongoose library to access the mongodb
- Use bullmq for async queue processing to access redis key-value store
- Use Fastify framework for RESTful API
- Use modern eslint
- Use nodejs testing framework for unit and integration tests

## Architecture and Structure

- **Folder Structure:** Organize code by feature or domain, following a structure like `/src/features/users`, `/src/features/products`, etc.
- **Separation of Concerns:**
  - **Routes:** Define API routes in `/src/routes`.
  - **Controllers:** Implement request-handling logic in `/src/controllers`.
  - **Services:** Contain business logic in `/src/services`.
  - **Models:** Define database schemas and types in `/src/models`.
- **Middleware:** Place custom Fastify middleware in `/src/middleware`.
- **Tests:** Store tests in a parallel structure under `/tests`.

## Code Generation Guidelines

- **API Endpoints:** When creating new endpoints, always include a corresponding controller, service, and data validation using the zod library.
  - For each API endpoint, create a Rest Client `.http` file in the `/local-api` directory with example requests and responses.
  - When updating existing endpoints, update the API documentation in the `/docs` directory using the OpenAPI v3 specification in JSON format (e.g., `/docs/openapi.json`).
- **Comments:** Use JSDoc comments for all public-facing functions and methods to describe their purpose, parameters, and return values.
- **Error Handling:** Implement robust error handling using standard HTTP status codes. Use Fastify's built-in error handling features.
- **Logging:** Use the Fastify's default pino library for all application logging with the default console.log transport
- **Security:** Always sanitize user input and prefer prepared statements in database queries to prevent injections.
- **README.md**: Update the README file with instructions on how to set up and run the project, including any new dependencies or environment variables.

## Testing Requirements

- **Coverage:** All new code must be accompanied by unit tests. Aim for at least 90% code coverage for critical components.
- **Structure:** Follow the "Arrange-Act-Assert" (AAA) pattern for all tests, but do not place Arrange-Act-Assert comments in test files
- **Framework:** Use Nodejs testing framework for all tests. For unit tests, mock external dependencies (e.g., API calls) using `mock(<dependency>)`. For integration tests, use `fetch` to make real HTTP requests to the Fastify server.
- **Folder:** Store tests in a parallel structure under `/tests` (e.g., `/tests/features/users`).
- **Naming:** Use `.test.ts` suffix for unit test files (e.g., `user-service.test.ts`) and `.integration.test.ts` for integration test files (e.g., `user-service.integration.test.ts`).
- **Types:** Use TypeScript for all test files.

## Code Review Instructions

- Flag any changes that do not include comprehensive unit tests.
- Ensure all functions and methods have JSDoc comments.
- Check for potential security vulnerabilities, especially in API endpoints.
- Confirm that functions are defined with TypeScript interfaces.
- Verify that error handling is implemented consistently across the codebase.
- Ensure the openapi spec file matches the implemented endpoints.
