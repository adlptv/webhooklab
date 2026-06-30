export type ProviderType = 'stripe' | 'github' | 'shopify' | 'slack' | 'generic';

export interface Endpoint {
  id: string;
  name: string;
  description: string;
  secret: string;
  provider: ProviderType;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookRequest {
  id: string;
  endpointId: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, string>;
  raw: string;
  verified: boolean;
  provider: string;
  statusCode: number;
  ipAddress: string;
  createdAt: string;
}

export interface Transform {
  id: string;
  name: string;
  inputFormat: string;
  outputFormat: string;
  template: Record<string, unknown>;
  createdAt: string;
}

export interface WSMessage {
  type: 'connected' | 'webhook_received' | 'webhook_replay' | 'error';
  endpointId?: string;
  data?: unknown;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
