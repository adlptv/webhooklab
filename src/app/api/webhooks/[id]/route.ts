import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectProvider, getProviderEventName } from '@/lib/providers';
import { verifySignature } from '@/lib/security/signatures';
import { rateLimit } from '@/lib/security/rate-limit';
import { broadcastToEndpoint } from '@/lib/websocket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleWebhook(request, params.id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleWebhook(request, params.id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleWebhook(request, params.id);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleWebhook(request, params.id);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleWebhook(request, params.id);
}

async function handleWebhook(request: NextRequest, endpointId: string) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitPerMinute = parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_MINUTE || '60', 10);
    const rl = rateLimit(`webhook:${endpointId}:${ip}`, rateLimitPerMinute);

    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetIn),
            'Retry-After': String(Math.ceil(rl.resetIn / 1000)),
          },
        }
      );
    }

    // Find endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    // Collect request data
    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();
    const query: Record<string, string> = {};
    const url = new URL(request.url);
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Detect provider
    const detection = detectProvider(headers);
    const provider = detection.provider;
    const eventName = getProviderEventName(provider, headers, rawBody);

    // Verify signature
    let verified = false;
    if (provider !== 'generic' && endpoint.secret) {
      const verification = verifySignature(provider, rawBody, headers, endpoint.secret);
      verified = verification.verified;
    } else if (provider === 'generic') {
      // For generic endpoints, check if the configured provider matches
      if (endpoint.provider !== 'generic' && endpoint.secret) {
        const verification = verifySignature(endpoint.provider, rawBody, headers, endpoint.secret);
        verified = verification.verified;
      } else {
        verified = true; // No verification for generic endpoints without secrets
      }
    }

    // Store the webhook request
    const webhookRequest = await prisma.webhookRequest.create({
      data: {
        endpointId,
        method,
        headers: JSON.stringify(headers),
        body: rawBody,
        query: JSON.stringify(query),
        raw: rawBody,
        verified,
        provider,
        statusCode: 200,
        ipAddress: ip,
      },
    });

    // Broadcast via WebSocket
    broadcastToEndpoint(endpointId, {
      type: 'webhook_received',
      data: {
        id: webhookRequest.id,
        method,
        provider,
        verified,
        eventName,
        body: rawBody.substring(0, 5000),
        headers,
        createdAt: webhookRequest.createdAt,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: webhookRequest.id,
        received: true,
        provider,
        verified,
      },
    });
  } catch (error) {
    console.error('Webhook handling error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
