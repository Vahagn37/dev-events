import { NextRequest, NextResponse } from 'next/server';
import { getEventBySlug } from '@/lib/store';

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return NextResponse.json(
        { message: 'Invalid or missing slug parameter' },
        { status: 400 },
      );
    }

    const event = await getEventBySlug(slug);
    if (!event) {
      return NextResponse.json(
        { message: `Event with slug '${slug.trim().toLowerCase()}' not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: 'Event fetched successfully', event },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching events by slug:', error);
    }

    return NextResponse.json(
      {
        message: 'Failed to fetch events',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
