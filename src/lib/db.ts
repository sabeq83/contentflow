import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const getDatabasePath = () => {
  const localDataDir = path.join(process.cwd(), 'data');
  const localDbPath = path.join(localDataDir, 'app.db');
  
  if (fs.existsSync(localDbPath)) {
    return localDbPath;
  }
  
  const fallbackDbPath = '/Users/sabeqmmursyid/_contentflow/data/app.db';
  if (fs.existsSync(fallbackDbPath)) {
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    fs.copyFileSync(fallbackDbPath, localDbPath);
    return localDbPath;
  }

  return localDbPath;
};

const dbPath = getDatabasePath();

const globalForDb = global as unknown as { db?: Database.Database };

export const db = globalForDb.db || new Database(dbPath);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
