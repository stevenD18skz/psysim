import { z } from 'zod';

export const SaveMetricsRequestSchema = z.object({
  sessionId: z.uuid(),
  empathyScore: z.number().min(0).max(100).optional(),
  communicationScore: z.number().min(0).max(100).optional(),
  problemSolvingScore: z.number().min(0).max(100).optional(),
  durationSeconds: z.number().int().positive().optional(),
  additionalData: z.record(z.string(), z.unknown()).optional(),
});

export const MetricsResponseSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  empathyScore: z.number().optional(),
  communicationScore: z.number().optional(),
  problemSolvingScore: z.number().optional(),
  durationSeconds: z.number().optional(),
  createdAt: z.iso.datetime(),
});

export type SaveMetricsRequest = z.infer<typeof SaveMetricsRequestSchema>;
export type MetricsResponse = z.infer<typeof MetricsResponseSchema>;
