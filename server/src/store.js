import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(__dirname, '../data/bookleaf_sample_data.json');
let client;
let mongoDb;

async function getDatabase() {
  if (mongoDb) return mongoDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Add it to server/.env.');
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  mongoDb = client.db(process.env.MONGODB_DB || 'bookleaf_portal');
  console.log(`Connected to MongoDB database: ${mongoDb.databaseName}`);
  return mongoDb;
}

function withoutMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

async function upsertCollection(collectionName, items, idField = 'id') {
  if (!items.length) return;
  const collection = mongoDb.collection(collectionName);
  const operations = items.map(item => {
    const key = item[idField];
    return {
      replaceOne: {
        filter: { _id: String(key) },
        replacement: { ...item, _id: String(key) },
        upsert: true
      }
    };
  });
  await collection.bulkWrite(operations, { ordered: true });
}

export async function loadDb() {
  const database = await getDatabase();
  const users = (await database.collection('users').find({}).toArray()).map(withoutMongoId);
  if (users.length === 0) {
    const source = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const authors = source.authors;
    const db = {
      users: authors.map(a => ({ id: a.author_id, role: 'author', name: a.name, email: a.email.toLowerCase(), passwordHash: null }))
        .concat([{ id: 'ADMIN001', role: 'admin', name: 'BookLeaf Support', email: 'admin@bookleaf.test', passwordHash: null }]),
      authors,
      tickets: [],
      messages: [],
      notes: [],
      counters: { ticket: 1, message: 1, note: 1 }
    };
    await saveDb(db);
    return db;
  }
  const [authors, tickets, messages, notes, countersDoc] = await Promise.all([
    database.collection('authors').find({}).toArray(),
    database.collection('tickets').find({}).toArray(),
    database.collection('messages').find({}).toArray(),
    database.collection('notes').find({}).toArray(),
    database.collection('counters').findOne({ _id: 'main' })
  ]);
  return {
    users,
    authors: authors.map(withoutMongoId),
    tickets: tickets.map(withoutMongoId),
    messages: messages.map(withoutMongoId),
    notes: notes.map(withoutMongoId),
    counters: countersDoc ? { ticket: countersDoc.ticket, message: countersDoc.message, note: countersDoc.note } : { ticket: 1, message: 1, note: 1 }
  };
}

// This simple assignment adapter persists the current in-memory state into separate collections.
// For a multi-instance production service, replace whole-state upserts with per-record repository writes.
export async function saveDb(db) {
  const database = await getDatabase();
  mongoDb = database;
  await Promise.all([
    upsertCollection('users', db.users, 'id'),
    upsertCollection('authors', db.authors, 'author_id'),
    upsertCollection('tickets', db.tickets, 'id'),
    upsertCollection('messages', db.messages, 'id'),
    upsertCollection('notes', db.notes, 'id'),
    database.collection('counters').replaceOne(
      { _id: 'main' },
      { _id: 'main', ...db.counters },
      { upsert: true }
    )
  ]);
}

export async function closeDb() {
  if (client) await client.close();
  client = undefined;
  mongoDb = undefined;
}
