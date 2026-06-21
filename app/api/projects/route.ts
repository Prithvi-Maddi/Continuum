import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryStore';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const project = memoryStore.createProject(name.trim());
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    const ok = memoryStore.renameProject(id, name.trim());
    if (!ok) return NextResponse.json({ error: 'project not found' }, { status: 404 });
    return NextResponse.json({ id, name: name.trim() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
