import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchRequestsSchema } from '@/lib/validations';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsed = searchRequestsSchema.safeParse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
      verified: queryParams.verified !== undefined ? queryParams.verified === 'true' : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, provider, startDate, endDate, verified, page, limit } = parsed.data;

    const where: Prisma.WebhookRequestWhereInput = {
      endpointId: params.id,
    };

    if (provider && provider !== 'all') {
      where.provider = provider;
    }

    if (verified !== undefined) {
      where.verified = verified;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (query) {
      where.OR = [
        { body: { contains: query } },
        { headers: { contains: query } },
        { raw: { contains: query } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.webhookRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// Export as JSON/HAR
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { format } = body;

    const requests = await prisma.webhookRequest.findMany({
      where: { endpointId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'har') {
      const har = {
        log: {
          version: '1.2',
          creator: { name: 'WebhookLab', version: '1.0.0' },
          entries: requests.map((req) => ({
            startedDateTime: new Date(req.createdAt).toISOString(),
            time: 0,
            request: {
              method: req.method,
              url: `/api/webhooks/${params.id}`,
              httpVersion: 'HTTP/1.1',
              headers: Object.entries(JSON.parse(req.headers)).map(([k, v]) => ({
                name: k,
                value: String(v),
              })),
              queryString: Object.entries(JSON.parse(req.query)).map(([k, v]) => ({
                name: k,
                value: String(v),
              })),
              postData: {
                mimeType: 'application/json',
                text: req.body,
              },
              headersSize: -1,
              bodySize: req.body.length,
            },
            response: {
              status: req.statusCode,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [],
              content: { size: 0, mimeType: 'text/plain' },
              redirectURL: '',
              headersSize: -1,
              bodySize: -1,
            },
            cache: {},
            timings: { send: 0, wait: 0, receive: 0 },
          })),
        },
      };
      return NextResponse.json({ success: true, data: har });
    }

    // Default: JSON export
    return NextResponse.json({
      success: true,
      data: requests.map((r) => ({
        ...r,
        headers: JSON.parse(r.headers),
        query: JSON.parse(r.query),
      })),
    });
  } catch (error) {
    console.error('Failed to export requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export' },
      { status: 500 }
    );
  }
}
