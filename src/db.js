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

function parsePositiveId(id) {
  const pageId = Number.parseInt(id, 10);

  if (!Number.isInteger(pageId) || pageId <= 0) {
    throw new Error("Invalid page id. Use a number like: 5");
  }

  return pageId;
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

function listPages() {
  initDb();

  return runSql(`
.headers on
.mode box
SELECT
  id,
  title,
  url,
  created_at
FROM pages
ORDER BY id DESC
LIMIT 10;
`);
}

function getPageById(id) {
  initDb();

  const pageId = parsePositiveId(id);

  const output = runSql(`
.mode json
SELECT
  id,
  url,
  title,
  description,
  headings_json,
  links_json,
  created_at
FROM pages
WHERE id = ${pageId}
LIMIT 1;
`);

  const rows = JSON.parse(output || "[]");

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

function deletePageById(id) {
  initDb();

  const pageId = parsePositiveId(id);

  const output = runSql(`
.mode list
DELETE FROM pages WHERE id = ${pageId};
SELECT changes();
`);

  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  const deletedCount = Number.parseInt(lines[lines.length - 1] || "0", 10);

  return deletedCount > 0;
}

module.exports = {
  dbPath,
  initDb,
  savePageScan,
  listPages,
  getPageById,
  deletePageById,
};
