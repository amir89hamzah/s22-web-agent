const express = require("express");
const { dbPath } = require("./db");

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
