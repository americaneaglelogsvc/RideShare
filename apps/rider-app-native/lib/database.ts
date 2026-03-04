import * as SQLite from 'expo-sqlite';

// REQ-16.4: Offline Mode & Queue Sync
export async function initDatabase() {
    const db = await SQLite.openDatabaseAsync('rideshare.db');
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );
  `);
    return db;
}

export async function queueOfflineAction(db: SQLite.SQLiteDatabase, action: string, payload: any) {
    await db.runAsync(
        'INSERT INTO offline_actions (action, payload) VALUES (?, ?)',
        action,
        JSON.stringify(payload)
    );
}
