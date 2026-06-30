import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { replayRequestSchema } from '@/lib/validations';
import { broadcastToEndpoint } from '@/lib/websocket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  try {
    const body = await request.json();
    const parsed = replayRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { targetUrl, method, headers, body: replayBody, delayMs, simulateFailure, failureStatusCode } = parsed.data;

    const originalRequest = await prisma.webhookRequest.findFirst({
      where: { id: params.reqId, endpointId: params.id },
    });

    if (!originalRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    // Use original body if no body provided
    const finalBody = replayBody || originalRequest.body;

    // Simulate delay
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Simulate failure
    if (simulateFailure) {
      broadcastToEndpoint(params.id, {
        type: 'webhook_replay',
        data: {
          reqId: params.reqId,
          status: 'failed',
          statusCode: failureStatusCode,
          simulated: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          status: 'simulated_failure',
          statusCode: failureStatusCode,
          message: 'Failure simulated successfully',
        },
      });
    }

    // Actually replay the request
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(targetUrl, {
      method,
      headers: fetchHeaders,
      body: method !== 'GET' ? finalBody : undefined,
    });

    const responseText = await response.text();

    broadcastToEndpoint(params.id, {
      type: 'webhook_replay',
      data: {
        reqId: params.reqId,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseBody: responseText.substring(0, 2000),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 5000),
      },
    });
  } catch (error) {
    console.error('Failed to replay request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to replay request' },
      { status: 500 }
    );
  }
}
