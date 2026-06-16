const express = require("express");
const { dbPath, getPages, getPageForApi } = require("./db");

require("dotenv").config({ quiet: true });

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "mobile-job-radar-agent",
    runtime: "s22-termux",
    dbPath,
    timestamp: new Date().toISOString(),
  });
});

app.get("/pages", (req, res) => {
  try {
    const pages = getPages(req.query.limit);

    res.json({
      ok: true,
      count: pages.length,
      pages,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/pages/:id", (req, res) => {
  try {
    const page = getPageForApi(req.params.id);

    if (!page) {
      res.status(404).json({
        ok: false,
        error: "Page not found",
        id: req.params.id,
      });
      return;
    }

    res.json({
      ok: true,
      page,
    });
  } catch (error) {
    const statusCode = error.message.includes("Invalid page id") ? 400 : 500;

    res.status(statusCode).json({
      ok: false,
      error: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
    path: req.path,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`S22 Mobile Job Radar Agent API running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
