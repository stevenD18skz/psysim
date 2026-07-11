import { z } from 'zod';

export const NPCChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  scenarioId: z.string(),
  npcConfig: z.object({
    personality: z.string(),
    background: z.string(),
    goals: z.array(z.string()),
  }),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(50),
});

export const NPCChatResponseSchema = z.object({
  message: z.string(),
  emotion: z.string().optional(),
  sessionId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export type NPCChatRequest = z.infer<typeof NPCChatRequestSchema>;
export type NPCChatResponse = z.infer<typeof NPCChatResponseSchema>;
