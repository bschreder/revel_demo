import { z } from 'zod';

/**
 * Zod schema for validating Journey objects.
 */
export const journeySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  start_node_id: z.string(),
  nodes: z.array(z.union([
    z.object({
      id: z.string(),
      type: z.literal('MESSAGE'),
      message: z.string(),
      next_node_id: z.string().nullable()
    }),
    z.object({
      id: z.string(),
      type: z.literal('DELAY'),
      duration_seconds: z.number(),
      next_node_id: z.string().nullable()
    }),
    z.object({
      id: z.string(),
      type: z.literal('CONDITIONAL'),
      condition: z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any()
      }),
      on_true_next_node_id: z.string().nullable(),
      on_false_next_node_id: z.string().nullable()
    })
  ]))
});

/**
 * Zod schema for validating the response of creating a Journey.
 */
export const journeyIdResponseSchema = z.object({
  journeyId: z.uuid()
});

export type JourneyIdResponse = z.infer<typeof journeyIdResponseSchema>;

/**
 * Zod schema for validating PatientContext objects.
 */
export const patientContextSchema = z.object({
  id: z.string(),
  age: z.number(),
  language: z.enum(['en', 'es']),
  condition: z.enum(['hip_replacement', 'knee_replacement'])
});

/**
 * Zod schema for validating the trigger journey request body.
 */
export const triggerJourneyRequestSchema = z.object({
  patient: patientContextSchema
});

/**
 * Zod schema for validating the trigger journey response.
 */
export const triggerJourneyResponseSchema = z.object({
  runId: z.uuid()
});

/**
 * Zod schema for validating route params containing a journeyId.
 */
export const journeyIdParamsSchema = z.object({
  journeyId: z.uuid()
});

/**
 * Zod schema for validating route params containing a runId.
 */
export const runIdParamsSchema = z.object({
  runId: z.uuid()
});

/**
 * Zod schema for validating a job data object.
 */
export const jobNode = z.object({
  runId: z.string(),
  journeyId: z.string(),
  currentNodeId: z.string(),
  patientContext: patientContextSchema,
});

export type JobNode = z.infer<typeof jobNode>;

/**
 * Zod schema for validating a run object.
 */
export const jobNodeResponseSchema = z.object({
  runId: z.string(),
  status: z.enum(['in_progress', 'completed', 'failed']),
  journeyId: z.string(),
  currentNodeId: z.string(),
  patientContext: patientContextSchema,
});

export type JobNodeResponseSchema = z.infer<typeof jobNodeResponseSchema>;