// Copies source -> an EMPTY destination only. Source is never modified.
// Backups contain private application data: owner-only and gitignored.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { MongoClient, BSON } from 'mongodb';

const env = parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8'));
const source = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const target = new MongoClient(env.MONGODB_URI_DEV, { serverSelectionTimeoutMS: 15000 });
const json = value => BSON.EJSON.stringify(value, { relaxed: false });
const digest = value => createHash('sha256').update(json(value)).digest('hex');
const apply = process.argv.includes('--apply');
try {
  await Promise.all([source.connect(), target.connect()]);
  const src = source.db(), dst = target.db();
  const sourceCollections = await src.listCollections().toArray();
  const destinationCollections = await dst.listCollections().toArray();
  for (const collection of destinationCollections) {
    if (collection.type !== 'collection' || await dst.collection(collection.name).countDocuments() !== 0) throw new Error('DESTINATION_NOT_EMPTY');
  }
  const snapshots = [];
  for (const collection of sourceCollections) {
    if (collection.type !== 'collection') throw new Error('UNSUPPORTED_SOURCE_COLLECTION');
    const documents = await src.collection(collection.name).find().sort({ _id: 1 }).toArray();
    const indexes = await src.collection(collection.name).indexes();
    snapshots.push({ name: collection.name, options: collection.options, indexes, documents, digest: digest(documents) });
  }
  console.log(JSON.stringify({ mode: apply ? 'copy' : 'inspect', sourceDatabase: src.databaseName, destinationDatabase: dst.databaseName, collections: snapshots.map(s => ({ name: s.name, count: s.documents.length })) }));
  if (apply) {
    const directory = new URL(`../.local-operations/mongo-backup-${Date.now()}/`, import.meta.url);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writeFileSync(new URL('source.ejson', directory), json(snapshots), { mode: 0o600, flag: 'wx' });
    writeFileSync(new URL('destination-metadata.ejson', directory), json(destinationCollections), { mode: 0o600, flag: 'wx' });
    // Detect a moving source before writes. Do not silently call a live copy a
    // consistent backup; hashes are checked again after the migration as well.
    for (const s of snapshots) if (digest(await src.collection(s.name).find().sort({ _id: 1 }).toArray()) !== s.digest) throw new Error('SOURCE_CHANGED_RETRY_WHEN_QUIET');
    for (const s of snapshots) {
      const existing = destinationCollections.find(c => c.name === s.name);
      if (existing && json(existing.options) !== json(s.options)) throw new Error('DESTINATION_OPTIONS_CONFLICT');
      if (!existing) await dst.createCollection(s.name, s.options);
      const indexes = s.indexes.filter(i => i.name !== '_id_').map(({ v, ns, ...index }) => index);
      if (indexes.length) await dst.collection(s.name).createIndexes(indexes);
      if (s.documents.length) await dst.collection(s.name).insertMany(s.documents, { ordered: true });
      if (digest(await dst.collection(s.name).find().sort({ _id: 1 }).toArray()) !== s.digest) throw new Error('DESTINATION_VERIFICATION_FAILED');
    }
    for (const s of snapshots) if (digest(await src.collection(s.name).find().sort({ _id: 1 }).toArray()) !== s.digest) throw new Error('SOURCE_CHANGED_DURING_COPY');
    console.log(JSON.stringify({ verified: true, sourceUnchanged: true, backup: directory.pathname }));
  }
} catch (error) {
  // Driver messages may contain credentials/hosts/documents. Never print them.
  const safe = /^(DESTINATION_|SOURCE_|UNSUPPORTED_)/.test(error.message) ? error.message : error.name;
  console.error(JSON.stringify({ failed: safe, code: error.code, note: 'No source data was changed; inspect the private backup before retrying a partial copy.' }));
  process.exitCode = 1;
} finally {
  await Promise.all([source.close(), target.close()]);
}
