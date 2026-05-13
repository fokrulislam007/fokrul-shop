import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, getClusterIndex, getClusterCount } from '@/lib/mongodb';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    for (let i = 0; i < getClusterCount(); i++) {
      try {
        const db = await getMongoDb(i);
        const session = await db.collection('sessions').findOne({ sessionId: id });
        if (session) {
          return NextResponse.json({ session });
        }
      } catch { continue; }
    }

    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  } catch (error) {
    console.error('Session detail error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
