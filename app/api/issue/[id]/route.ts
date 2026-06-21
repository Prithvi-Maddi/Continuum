import { NextRequest, NextResponse } from 'next/server';

// MVP: issues live in client Zustand only. This is a no-op stub.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json({ issue: { id, ...body } });
}
