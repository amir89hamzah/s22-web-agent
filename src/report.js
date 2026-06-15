const fs = require("fs");
const path = require("path");

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function safeFilePart(value) {
  return String(value || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function generateMarkdownReport(page) {
  const headings = parseJsonArray(page.headings_json);
  const links = parseJsonArray(page.links_json);

  const reportsDir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const fileName = `scan-${page.id}-${safeFilePart(page.title)}.md`;
  const outputPath = path.join(reportsDir, fileName);

  const lines = [];

  lines.push(`# Scan Report: ${page.title || "Untitled Page"}`);
  lines.push("");
  lines.push(`**ID:** ${page.id}`);
  lines.push(`**URL:** ${page.url}`);
  lines.push(`**Created At:** ${page.created_at}`);
  lines.push(`**Category:** ${page.category || "unknown"}`);
  lines.push(`**Relevance Score:** ${page.relevance_score || 0}`);
  lines.push("");
  lines.push("## Description");
  lines.push("");
  lines.push(page.description || "_No description found._");
  lines.push("");
  lines.push("## Classification Notes");
  lines.push("");
  lines.push(page.notes || "_No notes available._");
  lines.push("");
  lines.push("## Headings");
  lines.push("");

  if (headings.length === 0) {
    lines.push("_No headings found._");
  } else {
    headings.forEach((heading) => {
      lines.push(`- ${heading}`);
    });
  }

  lines.push("");
  lines.push("## Links");
  lines.push("");

  if (links.length === 0) {
    lines.push("_No links found._");
  } else {
    links.forEach((link) => {
      lines.push(`- [${link.text}](${link.href})`);
    });
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Generated locally on Samsung S22 using Termux, Node.js, and SQLite.");
  lines.push("- This report is generated from stored scan data.");
  lines.push("");

  fs.writeFileSync(outputPath, lines.join("\n"));

  return outputPath;
}

module.exports = {
  generateMarkdownReport,
};
