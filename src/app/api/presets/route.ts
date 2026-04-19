import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const presets = await store.listPresets();
    return NextResponse.json(presets);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load presets' }, { status: 500 });
  }
}
