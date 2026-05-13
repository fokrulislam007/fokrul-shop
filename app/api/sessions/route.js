import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb, getClusterIndex, getClusterCount, purgeOldSessions } from '@/lib/mongodb';

export async function POST(req) {
  try {
    let body;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = JSON.parse(text);
    }

    const { sessionId, fingerprintId, userId, events, metadata } = body;

    if (!sessionId || !fingerprintId || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const clusterIdx = getClusterIndex(fingerprintId);
    const db = await getMongoDb(clusterIdx);

    const updateDoc = {
      $setOnInsert: {
        sessionId,
        fingerprintId,
        userId: userId || null,
        startTime: new Date().toISOString(),
        metadata: metadata || {},
        createdAt: new Date(),
      },
      $push: { events: { $each: events } },
      $set: {
        lastUpdate: new Date().toISOString(),
        updatedAt: new Date(),
      },
      $inc: { eventCount: events.length },
    };

    await db.collection('sessions').updateOne(
      { sessionId },
      updateDoc,
      { upsert: true }
    );

    return NextResponse.json({ ok: true, cluster: clusterIdx, eventsSaved: events.length });
  } catch (error) {
    console.error('Sessions POST error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprintId = searchParams.get('fingerprintId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const allSessions = [];

    if (fingerprintId) {
      const clusterIdx = getClusterIndex(fingerprintId);
      const db = await getMongoDb(clusterIdx);
      const sessions = await db.collection('sessions')
        .find({ fingerprintId })
        .project({ events: 0 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      allSessions.push(...sessions);
    } else {
      const clusterCount = getClusterCount();
      for (let i = 0; i < clusterCount; i++) {
        try {
          const db = await getMongoDb(i);
          const sessions = await db.collection('sessions')
            .find({})
            .project({ events: 0 })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
          allSessions.push(...sessions);
        } catch (err) {
          console.error(`Failed to query cluster ${i}:`, err);
        }
      }
      allSessions.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return NextResponse.json({ sessions: allSessions, count: allSessions.length });
  } catch (error) {
    console.error('Sessions GET error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const deleted = await purgeOldSessions();
    return NextResponse.json({ deleted, message: `Purged ${deleted} old sessions` });
  } catch (error) {
    console.error('Sessions DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
