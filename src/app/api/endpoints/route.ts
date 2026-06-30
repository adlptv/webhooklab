import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEndpointSchema } from '@/lib/validations';
import { generateSecret } from '@/lib/utils';
import { rateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = rateLimit(`endpoints-list:${ip}`, 100);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rl.resetIn) } }
      );
    }

    const endpoints = await prisma.endpoint.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { requests: true } },
      },
    });

    return NextResponse.json({ success: true, data: endpoints });
  } catch (error) {
    console.error('Failed to list endpoints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch endpoints' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = rateLimit(`endpoints-create:${ip}`, 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, provider, secret } = parsed.data;

    const endpoint = await prisma.endpoint.create({
      data: {
        name,
        description: description || '',
        provider,
        secret: secret || generateSecret(),
      },
    });

    return NextResponse.json({ success: true, data: endpoint }, { status: 201 });
  } catch (error) {
    console.error('Failed to create endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create endpoint' },
      { status: 500 }
    );
  }
}
