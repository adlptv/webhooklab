import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateShareToken } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: params.id },
      include: {
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { requests: true } },
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: endpoint });
  } catch (error) {
    console.error('Failed to get endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch endpoint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: params.id },
    });

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    await prisma.endpoint.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete endpoint' },
      { status: 500 }
    );
  }
}

// Generate share token
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'share') {
      const shareToken = generateShareToken();
      const endpoint = await prisma.endpoint.update({
        where: { id: params.id },
        data: { shareToken },
      });
      return NextResponse.json({ success: true, data: { shareToken } });
    }

    if (action === 'unshare') {
      await prisma.endpoint.update({
        where: { id: params.id },
        data: { shareToken: null },
      });
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update endpoint' },
      { status: 500 }
    );
  }
}
