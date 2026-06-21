import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryStore';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') ?? 'proj_got_demo';
  const world = memoryStore.getWorld(projectId);
  // Return sources sorted newest-first, excluding the seed
  const sources = [...world.sources]
    .filter(s => s.kind !== 'seed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(sources);
}
