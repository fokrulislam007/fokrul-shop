import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, getClusterIndex } from '@/lib/mongodb';

export async function POST(req) {
  try {
    const body = await req.json();
    const { fingerprintId, visitorName, event, timestamp } = body;

    if (!fingerprintId || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const clusterIdx = getClusterIndex(fingerprintId);
    const db = await getMongoDb(clusterIdx);

    await db.collection('behavioral_events').insertOne({
      fingerprintId,
      visitorName,
      eventType: event.type,
      page: event.page || null,
      productId: event.productId || null,
      data: event.data || {},
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprintId = searchParams.get('fingerprintId');

    if (!fingerprintId) {
      return NextResponse.json({ error: 'fingerprintId required' }, { status: 400 });
    }

    const clusterIdx = getClusterIndex(fingerprintId);
    const db = await getMongoDb(clusterIdx);

    const events = await db.collection('behavioral_events')
      .find({ fingerprintId })
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Tracking GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
