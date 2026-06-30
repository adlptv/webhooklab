import { z } from 'zod';

export const createEndpointSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().default(''),
  provider: z.enum(['generic', 'stripe', 'github', 'shopify', 'slack']).default('generic'),
  secret: z.string().optional(),
});

export const updateEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const replayRequestSchema = z.object({
  targetUrl: z.string().url('Valid URL required'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional().default({}),
  body: z.string().optional().default(''),
  delayMs: z.number().min(0).max(30000).optional().default(0),
  simulateFailure: z.boolean().optional().default(false),
  failureStatusCode: z.number().min(400).max(599).optional().default(500),
});

export const transformRequestSchema = z.object({
  transformId: z.string().optional(),
  inputFormat: z.enum(['stripe', 'github', 'shopify', 'slack', 'generic']).optional(),
  outputFormat: z.enum(['slack', 'discord', 'teams', 'generic']).optional(),
  customTemplate: z.record(z.unknown()).optional(),
});

export const searchRequestsSchema = z.object({
  query: z.string().optional(),
  provider: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  verified: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type ReplayRequestInput = z.infer<typeof replayRequestSchema>;
export type TransformRequestInput = z.infer<typeof transformRequestSchema>;
export type SearchRequestsInput = z.infer<typeof searchRequestsSchema>;
