import { Store } from "express-session";

export function createPgSessionStore(query) {
  if (typeof query !== "function") {
    throw new Error("PostgreSQL session store membutuhkan fungsi query.");
  }

  const ensureTable = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS express_sessions (
        sid TEXT PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMPTZ NOT NULL
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_express_sessions_expire ON express_sessions(expire)");
  })();

  class PgSessionStore extends Store {
    async ready() {
      await ensureTable;
    }

    get(sid, callback) {
      this.ready()
        .then(() => query(
          "SELECT sess FROM express_sessions WHERE sid = $1 AND expire > NOW()",
          [sid],
        ))
        .then((result) => {
          const row = result?.rows?.[0];
          if (!row?.sess) return callback(null, null);
          const session = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
          return callback(null, session);
        })
        .catch((error) => callback(error));
    }

    set(sid, session, callback) {
      const maxAge = Number(session?.cookie?.maxAge || 1000 * 60 * 60 * 24 * 30);
      const expireMs = Date.now() + maxAge;
      this.ready()
        .then(() => query(
          `
            INSERT INTO express_sessions (sid, sess, expire)
            VALUES ($1, $2::jsonb, to_timestamp($3 / 1000.0))
            ON CONFLICT (sid) DO UPDATE
            SET sess = EXCLUDED.sess, expire = EXCLUDED.expire
          `,
          [sid, JSON.stringify(session), expireMs],
        ))
        .then(() => callback(null))
        .catch((error) => callback(error));
    }

    destroy(sid, callback) {
      this.ready()
        .then(() => query("DELETE FROM express_sessions WHERE sid = $1", [sid]))
        .then(() => callback(null))
        .catch((error) => callback(error));
    }

    touch(sid, session, callback) {
      const maxAge = Number(session?.cookie?.maxAge || 1000 * 60 * 60 * 24 * 30);
      const expireMs = Date.now() + maxAge;
      this.ready()
        .then(() => query(
          "UPDATE express_sessions SET expire = to_timestamp($2 / 1000.0) WHERE sid = $1",
          [sid, expireMs],
        ))
        .then(() => callback(null))
        .catch((error) => callback(error));
    }
  }

  return new PgSessionStore();
}

export function createLazySessionStore(factory) {
  let storePromise = null;

  function getStore() {
    if (!storePromise) storePromise = Promise.resolve().then(factory);
    return storePromise;
  }

  class LazySessionStore extends Store {
    get(sid, callback) {
      getStore().then((store) => store.get(sid, callback)).catch((error) => callback(error));
    }

    set(sid, session, callback) {
      getStore().then((store) => store.set(sid, session, callback)).catch((error) => callback(error));
    }

    destroy(sid, callback) {
      getStore().then((store) => store.destroy(sid, callback)).catch((error) => callback(error));
    }

    touch(sid, session, callback) {
      getStore().then((store) => store.touch(sid, session, callback)).catch((error) => callback(error));
    }
  }

  return new LazySessionStore();
}
