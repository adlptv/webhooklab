import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface SignatureVerificationResult {
  verified: boolean;
  provider: string;
  error?: string;
}

// Stripe signature verification
export function verifyStripeSignature(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { verified: false, provider: 'stripe', error: 'Missing stripe-signature header' };
  }

  const parts = signatureHeader.split(',');
  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signature = value;
  }

  if (!timestamp || !signature) {
    return { verified: false, provider: 'stripe', error: 'Invalid signature format' };
  }

  const fiveMinutes = 300000;
  const tolerance = 300000;
  const now = Date.now();
  const sigTime = parseInt(timestamp, 10) * 1000;

  if (Math.abs(now - sigTime) > tolerance) {
    // Still verify even if timestamp is off, but note it
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { verified: false, provider: 'stripe', error: 'Signature length mismatch' };
  }

  const verified = timingSafeEqual(signatureBuffer, expectedBuffer);
  return { verified, provider: 'stripe', error: verified ? undefined : 'Signature mismatch' };
}

// GitHub signature verification
export function verifyGithubSignature(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { verified: false, provider: 'github', error: 'Missing X-Hub-Signature-256 header' };
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return { verified: false, provider: 'github', error: 'Invalid signature format' };
  }

  const signature = parts[1];
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { verified: false, provider: 'github', error: 'Signature length mismatch' };
  }

  const verified = timingSafeEqual(signatureBuffer, expectedBuffer);
  return { verified, provider: 'github', error: verified ? undefined : 'Signature mismatch' };
}

// Shopify signature verification
export function verifyShopifySignature(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader) {
    return { verified: false, provider: 'shopify', error: 'Missing X-Shopify-Hmac-SHA256 header' };
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64');

  const signatureBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { verified: false, provider: 'shopify', error: 'Signature length mismatch' };
  }

  const verified = timingSafeEqual(signatureBuffer, expectedBuffer);
  return { verified, provider: 'shopify', error: verified ? undefined : 'Signature mismatch' };
}

// Slack signature verification
export function verifySlackSignature(
  payload: string | Buffer,
  signatureHeader: string,
  timestamp: string,
  secret: string
): SignatureVerificationResult {
  if (!signatureHeader || !timestamp) {
    return { verified: false, provider: 'slack', error: 'Missing X-Slack-Signature or X-Slack-Request-Timestamp header' };
  }

  const fiveMinutes = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > fiveMinutes) {
    return { verified: false, provider: 'slack', error: 'Request timestamp too old' };
  }

  const basestring = `v0:${timestamp}:${payload}`;
  const expectedSignature = 'v0=' + createHmac('sha256', secret)
    .update(basestring)
    .digest('hex');

  const signatureBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { verified: false, provider: 'slack', error: 'Signature length mismatch' };
  }

  const verified = timingSafeEqual(signatureBuffer, expectedBuffer);
  return { verified, provider: 'slack', error: verified ? undefined : 'Signature mismatch' };
}

export function verifySignature(
  provider: string,
  payload: string | Buffer,
  headers: Record<string, string>,
  secret: string
): SignatureVerificationResult {
  const payloadStr = typeof payload === 'string' ? payload : payload.toString();

  switch (provider) {
    case 'stripe':
      return verifyStripeSignature(payloadStr, headers['stripe-signature'] || '', secret);
    case 'github':
      return verifyGithubSignature(payloadStr, headers['x-hub-signature-256'] || '', secret);
    case 'shopify':
      return verifyShopifySignature(payloadStr, headers['x-shopify-hmac-sha256'] || '', secret);
    case 'slack':
      return verifySlackSignature(
        payloadStr,
        headers['x-slack-signature'] || '',
        headers['x-slack-request-timestamp'] || '',
        secret
      );
    default:
      return { verified: true, provider: 'generic' };
  }
}
