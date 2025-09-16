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
  journeyId: z.string()
});