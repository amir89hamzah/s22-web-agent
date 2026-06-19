const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { savePageScan, dbPath } = require("./db");
const { classifyPage } = require("./classifier");

function normalizeUrl(input) {
  if (!input) {
    throw new Error("Missing url.");
  }

  const trimmed = String(input).trim();

  if (!trimmed) {
    throw new Error("Missing url.");
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const candidateUrl = hasProtocol ? trimmed : `https://${trimmed}`;

  let parsedUrl;

  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    throw new Error("Invalid url. Use a URL like example.com or https://example.com");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid url protocol. Use http or https.");
  }

  return parsedUrl;
}

async function scanUrl(url) {
  const parsedUrl = normalizeUrl(url);

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      "User-Agent": "S22-Web-Agent/1.0",
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

  const pageId = savePageScan(result);

  return {
    result,
    pageId,
    outputPath,
    dbPath,
  };
}

module.exports = {
  normalizeUrl,
  scanUrl,
};
