// Explicit DEV-only reassignment of the reserved Nova demo identity to its
// controlled signer. Abort if any live/audit records already depend on it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { MongoClient, BSON } from 'mongodb';
import { privateKeyToAccount } from 'viem/accounts';
const env = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'));
const address = privateKeyToAccount(env.NOVA_DEMO_PRIVATE_KEY).address.toLowerCase();
const previous = `0x${'10'.repeat(20)}`;
const client = new MongoClient(env.MONGODB_URI_DEV, { serverSelectionTimeoutMS: 15000 });
try {
  if (env.SOMNIA_CHAIN_ID !== '50312' || env.MONGODB_CONNECTION_KEY !== 'MONGODB_URI_DEV') throw new Error('DEV_SHANNON_ONLY');
  await client.connect();
  const db = client.db();
  const existing = await db.collection('users').findOne({ walletAddress: address });
  if (existing) {
    if (!existing.isDemo || existing.avatarSeed !== 'nova') throw new Error('DESTINATION_IDENTITY_CONFLICT');
    console.log(JSON.stringify({ ready: true, wallet: address, database: db.databaseName }));
  } else {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const user = await db.collection('users').findOne({ walletAddress: previous, isDemo: true }, { session });
        if (!user || user.reputationScore < 80 || user.resolvedPredictions < 25) throw new Error('VERIFIED_NOVA_SEED_REQUIRED');
        const predictions = await db.collection('predictions').find({ predictorAddress: previous }, { session }).toArray();
        if (predictions.some(p => p.source !== 'DEMO_SEED' || p.status !== 'RESOLVED')) throw new Error('NONHISTORICAL_NOVA_RECORD');
        const ids = predictions.map(p => p._id);
        for (const name of ['predictionunlocks', 'backedpredictions']) {
          if (await db.collection(name).countDocuments({ $or: [{ prediction: { $in: ids } }, { predictorAddress: previous }, { buyerAddress: previous }, { backerAddress: previous }] }, { session })) throw new Error('NOVA_HAS_AUDIT_REFERENCES');
        }
        const folder = new URL('../.local-operations/', import.meta.url);
        mkdirSync(folder, { recursive: true, mode: 0o700 });
        writeFileSync(new URL(`nova-before-${Date.now()}.ejson`, folder), BSON.EJSON.stringify({ user, predictions }, { relaxed: false }), { mode: 0o600, flag: 'wx' });
        await db.collection('users').updateOne({ _id: user._id, walletAddress: previous }, { $set: { walletAddress: address, displayName: 'Nova (Demo)', isDemo: true } }, { session });
        await db.collection('predictions').updateMany({ predictorAddress: previous, source: 'DEMO_SEED' }, { $set: { predictorAddress: address } }, { session });
        console.log(JSON.stringify({ prepared: true, wallet: address, historicalRecords: predictions.length, database: db.databaseName, seededQualification: true }));
      });
    } finally { await session.endSession(); }
  }
} catch (e) { console.error(JSON.stringify({ error: /^[A-Z_]+$/.test(e.message) ? e.message : e.name })); process.exitCode = 1; }
finally { await client.close(); }
