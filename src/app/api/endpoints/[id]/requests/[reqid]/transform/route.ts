import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformRequestSchema } from '@/lib/validations';
import {
  stripeToSlack,
  githubToDiscord,
  shopifyToSlack,
  applyTemplate,
} from '@/lib/transforms';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  try {
    const body = await request.json();
    const parsed = transformRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { transformId, inputFormat, outputFormat, customTemplate } = parsed.data;

    const originalRequest = await prisma.webhookRequest.findFirst({
      where: { id: params.reqId, endpointId: params.id },
    });

    if (!originalRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(originalRequest.body);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Original request body is not valid JSON' },
        { status: 400 }
      );
    }

    const parsedHeaders: Record<string, string> = JSON.parse(originalRequest.headers);

    // Determine transform to apply
    let transformInputFormat = inputFormat || originalRequest.provider;
    let transformOutputFormat = outputFormat || 'slack';

    // If a specific transform is provided, load it
    if (transformId) {
      const transform = await prisma.transform.findUnique({
        where: { id: transformId },
      });

      if (!transform) {
        return NextResponse.json(
          { success: false, error: 'Transform not found' },
          { status: 404 }
        );
      }

      let template: Record<string, unknown>;
      try {
        template = JSON.parse(transform.template);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Transform template is invalid JSON' },
          { status: 400 }
        );
      }

      const result = applyTemplate(parsedBody, template);
      return NextResponse.json(result);
    }

    // Use custom template if provided
    if (customTemplate) {
      const result = applyTemplate(parsedBody, customTemplate);
      return NextResponse.json(result);
    }

    // Built-in transforms
    if (transformInputFormat === 'stripe' && transformOutputFormat === 'slack') {
      const result = stripeToSlack(parsedBody);
      return NextResponse.json(result);
    }

    if (transformInputFormat === 'github' && transformOutputFormat === 'discord') {
      const result = githubToDiscord(parsedBody, parsedHeaders);
      return NextResponse.json(result);
    }

    if (transformInputFormat === 'shopify' && transformOutputFormat === 'slack') {
      const topic = parsedHeaders['x-shopify-topic'] || 'shopify.event';
      const result = shopifyToSlack(parsedBody, topic);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, output: null, error: `No transform available for ${transformInputFormat} → ${transformOutputFormat}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to transform request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to transform request' },
      { status: 500 }
    );
  }
}
