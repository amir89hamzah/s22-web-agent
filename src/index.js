const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { savePageScan, dbPath } = require("./db");
require("dotenv").config({ quiet: true });

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.log("Usage:");
    console.log("node src/index.js https://example.com");
    process.exit(1);
  }

  console.log("Scanning URL:");
  console.log(url);
  console.log("");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "S22-Mobile-Job-Radar-Agent/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const headings = [];
  $("h1, h2").each((index, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (text && headings.length < 10) {
      headings.push(text);
    }
  });

  const links = [];
  $("a").each((index, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const href = $(element).attr("href");

    if (text && href && links.length < 15) {
      links.push({ text, href });
    }
  });

  const result = {
    scanned_at: new Date().toISOString(),
    url,
    title,
    description,
    headings,
    links,
  };

  console.log("=== PAGE SUMMARY ===");
  console.log("Title:", title || "(no title)");
  console.log("Description:", description || "(no description)");
  console.log("");

  console.log("=== HEADINGS ===");
  headings.forEach((heading, index) => {
    console.log(`${index + 1}. ${heading}`);
  });

  console.log("");
  console.log("=== LINKS ===");
  links.forEach((link, index) => {
    console.log(`${index + 1}. ${link.text} -> ${link.href}`);
  });

  const reportsDir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const outputPath = path.join(reportsDir, "last-scan.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  savePageScan(result);

  console.log("");
  console.log("Saved report to:");
  console.log(outputPath);

  console.log("");
  console.log("Saved SQLite DB to:");
  console.log(dbPath);
}

main().catch((error) => {
  console.error("Scan failed:");
  console.error(error.message);
  process.exit(1);
});
