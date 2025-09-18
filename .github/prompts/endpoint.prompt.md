---
mode: agent
---

---

## mode: agent

Define a new REST API endpoint for the application, following the established pattern of the POST /journeys endpoint in the codebase:

**Requirements:**

- The endpoint must be implemented using Fastify and ESM TypeScript.
- Use the same architectural separation: define the route in `/src/routes`, the controller in `/src/controllers`, the service in `/src/services`.
- Use the schema in `/src/models`.
- Validate request and response bodies using zod schemas. `src/models/journey-schema.ts` contains the zod schema.
- Ensure the service function mirrors the pattern of `saveJourney` in `/src/services/journeys-service.ts`.
- Add a sample `.http` file for the endpoint in `/local-api`.
- Update the OpenAPI spec in `/docs/openapi.json` to document the new endpoint.
- Use `src/db/mongodb-interface.ts` for database interactions, following the pattern of existing services.

**Constraints:**

- Follow the naming, style, and folder conventions described in the project overview.
- Use async/await and robust error handling.
- Include JSDoc comments for all public functions.
- Add comprehensive unit and integration tests for the new endpoint.
- For unit tests, use mongodb-memory-server to mock the database.
- For integration tests, start the Fastify server and use fetch to make real HTTP requests to the Fastify server.

**Success Criteria:**

- The new endpoint is fully functional, tested, and documented.
- All code matches the conventions and structure of the existing POST /journeys implementation.
