export type ProviderType = 'stripe' | 'github' | 'shopify' | 'slack' | 'generic';

export interface ProviderDetectionResult {
  provider: ProviderType;
  confidence: number;
  eventName?: string;
}

export function detectProvider(headers: Record<string, string>): ProviderDetectionResult {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  // Stripe
  if (lowerHeaders['stripe-signature']) {
    return { provider: 'stripe', confidence: 0.99 };
  }

  // GitHub
  if (lowerHeaders['x-github-event'] || lowerHeaders['x-github-delivery']) {
    return {
      provider: 'github',
      confidence: 0.99,
      eventName: lowerHeaders['x-github-event'],
    };
  }

  // Shopify
  if (lowerHeaders['x-shopify-topic'] || lowerHeaders['x-shopify-hmac-sha256']) {
    return {
      provider: 'shopify',
      confidence: 0.99,
      eventName: lowerHeaders['x-shopify-topic'],
    };
  }

  // Slack
  if (lowerHeaders['x-slack-signature'] || lowerHeaders['x-slack-request-timestamp']) {
    return { provider: 'slack', confidence: 0.99 };
  }

  // Heuristic detection via user-agent
  const userAgent = lowerHeaders['user-agent'] || '';
  if (userAgent.includes('Stripe')) {
    return { provider: 'stripe', confidence: 0.7 };
  }
  if (userAgent.includes('GitHub-Hookshot')) {
    return { provider: 'github', confidence: 0.7 };
  }
  if (userAgent.includes('Shopify')) {
    return { provider: 'shopify', confidence: 0.7 };
  }
  if (userAgent.includes('Slackbot')) {
    return { provider: 'slack', confidence: 0.7 };
  }

  return { provider: 'generic', confidence: 0 };
}

export function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    stripe: '#635bff',
    github: '#24292e',
    shopify: '#95bf47',
    slack: '#4a154b',
    generic: '#6b7280',
  };
  return colors[provider] || colors.generic;
}

export function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    stripe: '💳',
    github: '🐙',
    shopify: '🛍️',
    slack: '💬',
    generic: '🔗',
  };
  return icons[provider] || icons.generic;
}

export function getProviderEventName(provider: string, headers: Record<string, string>, body: string): string | null {
  const lowerHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = value;
  }

  switch (provider) {
    case 'stripe': {
      try {
        const parsed = JSON.parse(body);
        return parsed.type || null;
      } catch {
        return null;
      }
    }
    case 'github':
      return lowerHeaders['x-github-event'] || null;
    case 'shopify':
      return lowerHeaders['x-shopify-topic'] || null;
    case 'slack':
      return 'slack_event';
    default:
      return null;
  }
}
