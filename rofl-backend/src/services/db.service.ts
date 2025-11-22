import level from 'level-rocksdb';
import { env } from '../config/env';

// Database path - uses persistent volume in ROFL
const DB_PATH = env.DB_PATH;

let db: ReturnType<typeof level> | null = null;

export const initializeDatabase = async (): Promise<void> => {
  db = level(DB_PATH);
  console.log(`Database initialized at ${DB_PATH}`);
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('Database closed');
  }
};

export const dbGet = async (key: string): Promise<string | null> => {
  if (!db) throw new Error('Database not initialized');
  try {
    return await db.get(key);
  } catch (error: any) {
    if (error.notFound) return null;
    throw error;
  }
};

export const dbPut = async (key: string, value: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  await db.put(key, value);
};

export const dbDel = async (key: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized');
  await db.del(key);
};

export const dbGetAll = async (prefix: string): Promise<Array<{ key: string; value: string }>> => {
  if (!db) throw new Error('Database not initialized');

  const results: Array<{ key: string; value: string }> = [];

  return new Promise((resolve, reject) => {
    db!.createReadStream({
      gte: prefix,
      lte: prefix + '\xFF'
    })
      .on('data', (data: { key: string; value: string }) => {
        results.push({ key: data.key, value: data.value });
      })
      .on('error', reject)
      .on('end', () => resolve(results));
  });
};
