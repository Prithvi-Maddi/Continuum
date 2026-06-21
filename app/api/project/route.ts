import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryStore';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (id) {
      const world = memoryStore.getWorld(id);
      return NextResponse.json(world);
    }
    // No id → return project list
    return NextResponse.json(memoryStore.getProjectList());
  } catch (error) {
    return NextResponse.json({ error: { code: 'store_error', message: String(error) } }, { status: 500 });
  }
}
