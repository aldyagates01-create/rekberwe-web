import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { Store } from "express-session";

export function createSqliteSessionStore(dataDir) {
  const resolvedDir = path.resolve(dataDir || path.join(process.cwd(), "data"));
  fs.mkdirSync(resolvedDir, { recursive: true });
  const db = new Database(path.join(resolvedDir, "rekberwe.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
  `);

  const getStmt = db.prepare("SELECT sess FROM sessions WHERE sid = ? AND expired > ?");
  const setStmt = db.prepare(`
    INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
    ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
  `);
  const destroyStmt = db.prepare("DELETE FROM sessions WHERE sid = ?");
  const touchStmt = db.prepare("UPDATE sessions SET expired = ? WHERE sid = ?");
  const cleanupStmt = db.prepare("DELETE FROM sessions WHERE expired <= ?");

  class SqliteSessionStore extends Store {
    get(sid, callback) {
      try {
        cleanupStmt.run(Date.now());
        const row = getStmt.get(sid, Date.now());
        if (!row?.sess) return callback(null, null);
        return callback(null, JSON.parse(row.sess));
      } catch (error) {
        return callback(error);
      }
    }

    set(sid, session, callback) {
      try {
        const maxAge = Number(session?.cookie?.maxAge || 1000 * 60 * 60 * 24 * 7);
        const expired = Date.now() + maxAge;
        setStmt.run(sid, JSON.stringify(session), expired);
        return callback(null);
      } catch (error) {
        return callback(error);
      }
    }

    destroy(sid, callback) {
      try {
        destroyStmt.run(sid);
        return callback(null);
      } catch (error) {
        return callback(error);
      }
    }

    touch(sid, session, callback) {
      try {
        const maxAge = Number(session?.cookie?.maxAge || 1000 * 60 * 60 * 24 * 7);
        touchStmt.run(Date.now() + maxAge, sid);
        return callback(null);
      } catch (error) {
        return callback(error);
      }
    }
  }

  return new SqliteSessionStore();
}
