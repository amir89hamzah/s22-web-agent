const {
  listPages,
  getPageById,
  deletePageById,
} = require("./db");
const { generateMarkdownReport } = require("./report");
const { scanUrl } = require("./scanner");

require("dotenv").config({ quiet: true });

function printHelp() {
  console.log("S22 Mobile Job Radar Agent");
  console.log("");
  console.log("Usage:");
  console.log("  node src/index.js scan https://example.com");
  console.log("  node src/index.js list");
  console.log("  node src/index.js show 5");
  console.log("  node src/index.js delete 5");
  console.log("  node src/index.js report 5");
  console.log("");
  console.log("Backward compatible:");
  console.log("  node src/index.js https://example.com");
}

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

function showPage(id) {
  const page = getPageById(id);

  if (!page) {
    console.log(`No scan found for id: ${id}`);
    return;
  }

  const headings = parseJsonArray(page.headings_json);
  const links = parseJsonArray(page.links_json);

  console.log("=== SCAN DETAIL ===");
  console.log("ID:", page.id);
  console.log("Title:", page.title || "(no title)");
  console.log("URL:", page.url);
  console.log("Created At:", page.created_at);
  console.log("Category:", page.category || "unknown");
  console.log("Relevance Score:", page.relevance_score || 0);
  console.log("Notes:", page.notes || "(no notes)");
  console.log("Description:", page.description || "(no description)");
  console.log("");

  console.log("=== HEADINGS ===");
  if (headings.length === 0) {
    console.log("(no headings found)");
  } else {
    headings.forEach((heading, index) => {
      console.log(`${index + 1}. ${heading}`);
    });
  }

  console.log("");
  console.log("=== LINKS ===");
  if (links.length === 0) {
    console.log("(no links found)");
  } else {
    links.forEach((link, index) => {
      console.log(`${index + 1}. ${link.text} -> ${link.href}`);
    });
  }
}

function deletePage(id) {
  const deleted = deletePageById(id);

  if (deleted) {
    console.log(`Deleted scan id: ${id}`);
  } else {
    console.log(`No scan found for id: ${id}`);
  }
}

function reportPage(id) {
  const page = getPageById(id);

  if (!page) {
    console.log(`No scan found for id: ${id}`);
    return;
  }

  const outputPath = generateMarkdownReport(page);

  console.log("Generated markdown report:");
  console.log(outputPath);
}

function printScanResult(scan) {
  const result = scan.result;

  console.log("=== PAGE SUMMARY ===");
  console.log("Title:", result.title || "(no title)");
  console.log("URL:", result.url);
  console.log("Description:", result.description || "(no description)");
  console.log("Category:", result.category);
  console.log("Relevance Score:", result.relevance_score);
  console.log("Notes:", result.notes);
  console.log("");

  console.log("=== HEADINGS ===");
  if (result.headings.length === 0) {
    console.log("(no h1/h2 headings found)");
  } else {
    result.headings.forEach((heading, index) => {
      console.log(`${index + 1}. ${heading}`);
    });
  }

  console.log("");
  console.log("=== LINKS ===");
  if (result.links.length === 0) {
    console.log("(no links found)");
  } else {
    result.links.forEach((link, index) => {
      console.log(`${index + 1}. ${link.text} -> ${link.href}`);
    });
  }

  console.log("");
  console.log("Saved report to:");
  console.log(scan.outputPath);

  console.log("");
  console.log("Saved SQLite DB to:");
  console.log(scan.dbPath);
}

async function scanAndPrint(url) {
  console.log("Scanning URL:");
  console.log(url);
  console.log("");

  const scan = await scanUrl(url);
  printScanResult(scan);
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "list") {
    console.log(listPages());
    return;
  }

  if (command === "show") {
    const id = process.argv[3];

    if (!id) {
      console.log("Missing id.");
      console.log("");
      printHelp();
      process.exit(1);
    }

    showPage(id);
    return;
  }

  if (command === "delete") {
    const id = process.argv[3];

    if (!id) {
      console.log("Missing id.");
      console.log("");
      printHelp();
      process.exit(1);
    }

    deletePage(id);
    return;
  }

  if (command === "report") {
    const id = process.argv[3];

    if (!id) {
      console.log("Missing id.");
      console.log("");
      printHelp();
      process.exit(1);
    }

    reportPage(id);
    return;
  }

  if (command === "scan") {
    const url = process.argv[3];

    if (!url) {
      console.log("Missing URL.");
      console.log("");
      printHelp();
      process.exit(1);
    }

    await scanAndPrint(url);
    return;
  }

  if (command.startsWith("http://") || command.startsWith("https://")) {
    await scanAndPrint(command);
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log("");
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("Command failed:");
  console.error(error.message);
  process.exit(1);
});
