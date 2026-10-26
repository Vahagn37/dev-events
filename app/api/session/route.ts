import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    { user },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
