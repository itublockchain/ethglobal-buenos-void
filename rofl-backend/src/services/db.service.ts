import level from 'level-rocksdb';
import { env } from '../config/env';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// Database path - uses persistent volume in ROFL
const DB_PATH = env.DB_PATH;

let db: ReturnType<typeof level> | null = null;

export const initializeDatabase = async (): Promise<void> => {
  // Ensure parent directory exists
  const parentDir = dirname(DB_PATH);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

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
    const value = await db.get(key);
    return value;
  } catch (error: any) {
    console.log('DB get error:', error.code, error.type, error.notFound, error.message);
    if (error.notFound || error.code === 'LEVEL_NOT_FOUND') return null;
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
