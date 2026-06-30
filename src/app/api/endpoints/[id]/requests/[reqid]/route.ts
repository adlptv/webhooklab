import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  try {
    const webhookRequest = await prisma.webhookRequest.findFirst({
      where: {
        id: params.reqId,
        endpointId: params.id,
      },
    });

    if (!webhookRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...webhookRequest,
        headers: JSON.parse(webhookRequest.headers),
        query: JSON.parse(webhookRequest.query),
      },
    });
  } catch (error) {
    console.error('Failed to get request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}
