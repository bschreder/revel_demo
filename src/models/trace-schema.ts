import { z } from 'zod';
import { patientContextSchema } from './journey-schema.js';

/**
 * Zod schema for validating individual execution steps in a run trace.
 */
export const stepResultMessageSchema = z.object({
  message: z.string()
});

/**
 * Zod schema for validating delay step results.
 */
export const stepResultDelaySchema = z.object({
  duration_seconds: z.number()
});

/**
 * Zod schema for validating conditional step results.
 */
export const stepResultConditionalSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.any(),
  evaluated: z.any(),
  outcome: z.boolean(),
  next_node_id: z.string().nullable()
});

/**
 * Zod schema for validating execution steps.
 */
export const executionStepSchema = z.object({
  nodeId: z.string(),
  type: z.enum(['MESSAGE', 'DELAY', 'CONDITIONAL']),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  result: z.union([
    stepResultMessageSchema,
    stepResultDelaySchema,
    stepResultConditionalSchema
  ]).optional()
});

/**
 *  Zod schema for validating the response of a run trace.
 */
export const runTraceResponseSchema = z.object({
  runId: z.string(),
  journeyId: z.string(),
  status: z.enum(['in_progress', 'completed', 'failed']),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  currentNodeId: z.string().nullable(),
  patientContext: patientContextSchema,
  steps: z.array(executionStepSchema)
});

export type RunTraceResponse = z.infer<typeof runTraceResponseSchema>;
export type ExecutionStep = z.infer<typeof executionStepSchema>;