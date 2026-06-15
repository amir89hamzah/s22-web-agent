const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "radar.db");

function runSql(sql) {
  fs.mkdirSync(dataDir, { recursive: true });

  return execFileSync("sqlite3", [dbPath], {
    input: sql,
    encoding: "utf8",
  });
}

function sqlString(value) {
  if (value === undefined || value === null) {
    return "NULL";
  }

  return "'" + String(value).replace(/'/g, "''") + "'";
}

function initDb() {
  runSql(`
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  headings_json TEXT,
  links_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
}

function savePageScan(result) {
  initDb();

  const sql = `
INSERT INTO pages (
  url,
  title,
  description,
  headings_json,
  links_json,
  created_at
)
VALUES (
  ${sqlString(result.url)},
  ${sqlString(result.title)},
  ${sqlString(result.description)},
  ${sqlString(JSON.stringify(result.headings || []))},
  ${sqlString(JSON.stringify(result.links || []))},
  ${sqlString(result.scanned_at)}
);
`;

  runSql(sql);
}

module.exports = {
  dbPath,
  initDb,
  savePageScan,
};
