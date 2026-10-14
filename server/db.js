const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const defaultPath = path.join(__dirname, '..', 'database', 'rapidresq.db');
const dbPath = process.env.RAPIDRESQ_DB || defaultPath;

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
} catch (e) {
  const sqlite = (process.getBuiltinModule && process.getBuiltinModule('node:sqlite')) || require('node:sqlite');
  const { DatabaseSync } = sqlite;
  db = new DatabaseSync(dbPath);
  db.pragma = function (str) {
    try {
      return db.exec(`PRAGMA ${str}`);
    } catch (_) {}
  };
  let inTransaction = 0;
  db.transaction = function (fn) {
    return function (...args) {
      const isNested = inTransaction > 0;
      const savepoint = `sp_${inTransaction}`;
      if (isNested) {
        db.exec(`SAVEPOINT ${savepoint}`);
      } else {
        db.exec('BEGIN');
      }
      inTransaction++;
      try {
        const res = fn(...args);
        if (isNested) {
          db.exec(`RELEASE ${savepoint}`);
        } else {
          db.exec('COMMIT');
        }
        return res;
      } catch (err) {
        if (isNested) {
          db.exec(`ROLLBACK TO ${savepoint}`);
        } else {
          db.exec('ROLLBACK');
        }
        throw err;
      } finally {
        inTransaction--;
      }
    };
  };
}

if (dbPath !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));

module.exports = db;
