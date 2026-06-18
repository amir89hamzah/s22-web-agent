# S22 Mobile Job Radar Agent — Progress

## Current Status

The project is now running as a mobile-first AI automation / MCP portfolio project on Samsung S22 using Termux.

Current main branch includes:
- CLI scanner
- HTTP API server
- MCP server
- URL normalization
- MCP tools for scan/list/get/report
- Browser inspection via Debian proot Playwright worker
- Documentation for proot Playwright setup

## Completed Features

### CLI
- `scan <url>`
- `list`
- `show <id>`
- `delete <id>`
- `report <id>`
- `help`

### HTTP API
Runs on port `3001`.

Available endpoints:
- `GET /health`
- `POST /scan`
- `GET /pages`
- `GET /pages/:id`
- `GET /report/:id`

### MCP Tools
Tested through MCP Inspector:
- `job_radar_scan`
- `job_radar_list_pages`
- `job_radar_get_page`
- `job_radar_get_report`
- `browser_inspect_url`

### URL Normalization
Simple domain input is supported.

Example:

```bash
node src/index.js scan example.com
