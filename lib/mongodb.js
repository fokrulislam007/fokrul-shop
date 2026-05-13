// ============================================
// MongoDB Client — Multi-Cluster Support
// Server-side only (used in API routes)
// ============================================

import { MongoClient } from 'mongodb';

const CLUSTER_URIS = [
  process.env.MONGODB_URI_1 || '',
  process.env.MONGODB_URI_2 || '',
  process.env.MONGODB_URI_3 || '',
].filter(uri => uri && !uri.includes('PLACEHOLDER'));

const connections = new Map();

/** Get a MongoDB connection for a given cluster index (0-based) */
export async function getMongoDb(clusterIndex = 0) {
  const idx = clusterIndex % CLUSTER_URIS.length;
  const cached = connections.get(idx);
  if (cached) return cached.db;

  const uri = CLUSTER_URIS[idx];
  if (!uri) throw new Error(`No MongoDB URI configured for cluster ${idx}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('ecommerce');
  connections.set(idx, { client, db, uri });
  return db;
}

/** Get the appropriate cluster for a user based on their ID hash */
export function getClusterIndex(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CLUSTER_URIS.length;
}

/** Get cluster count */
export function getClusterCount() {
  return CLUSTER_URIS.length;
}

/** Auto-purge sessions older than 30 days from all clusters */
export async function purgeOldSessions() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;

  for (let i = 0; i < CLUSTER_URIS.length; i++) {
    try {
      const db = await getMongoDb(i);
      const result = await db.collection('sessions').deleteMany({
        timestamp: { $lt: thirtyDaysAgo.toISOString() }
      });
      totalDeleted += result.deletedCount;
    } catch (err) {
      console.error(`Purge failed for cluster ${i}:`, err);
    }
  }
  return totalDeleted;
}
