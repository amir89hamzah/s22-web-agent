const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { savePageScan, dbPath } = require("./db");
const { classifyPage } = require("./classifier");

async function scanUrl(url) {
  if (!url) {
    throw new Error("Missing url.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid url. Use a full URL like https://example.com");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid url protocol. Use http or https.");
  }

  const response = await fetch(parsedUrl.toString(), {
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
    url: parsedUrl.toString(),
    title,
    description,
    headings,
    links,
  };

  const classification = classifyPage(result);

  result.category = classification.category;
  result.relevance_score = classification.relevance_score;
  result.notes = classification.notes;

  const reportsDir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const outputPath = path.join(reportsDir, "last-scan.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  savePageScan(result);

  return {
    result,
    outputPath,
    dbPath,
  };
}

module.exports = {
  scanUrl,
};
