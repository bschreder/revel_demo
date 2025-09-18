---
mode: agent
---

BullMQ Queue Scaffolding Prompt

## Task Definition

Scaffold a minimal, production-ready BullMQ queue in an ESM Node.js TypeScript project using a standalone Redis database (see `.env`). The solution must follow best practices for reliability, error handling, logging, and testability.

## Requirements

- Use BullMQ (https://docs.bullmq.io/) for queue management
- Use TypeScript and Node.js
- Put all source files in `src/executor/` folder and all tests in `tests/features/executor/`
- Integrate with a running Redis instance
- Implement:
  - Queue creation
  - Worker for job processing
  - Example job addition
  - Event listeners for job lifecycle (completed, failed, progress)
  - Error handling and logging (use pino or Fastify logger)
- Configuration via environment variables
- Provide a minimal example for adding and processing jobs
- Include JSDoc comments for all public functions
- Include unit tests (Jest) for queue and worker logic
- Follow project conventions for file/folder structure and naming

## Constraints

- Use only BullMQ and official dependencies (no bull, no third-party wrappers)
- Use async/await for all asynchronous code
- No polling; use event-driven design
- All code must be TypeScript
- No hardcoded Redis credentials
- Logging must use pino or Fastify's logger
- All public APIs must be documented

## Success Criteria

- Queue and worker are fully functional and can process jobs
- All events (completed, failed, progress) are handled and logged
- Unit tests cover queue creation, job addition, and worker processing
- Code is clean, idiomatic, and matches project conventions
- README includes setup and usage instructions
- All code is commented and documented

## References

- BullMQ Docs: https://docs.bullmq.io/
- BullMQ Quick Start: https://docs.bullmq.io/readme-1
- BullMQ Patterns: https://docs.bullmq.io/patterns/adding-bulks
- BullMQ API Reference: https://api.docs.bullmq.io/
