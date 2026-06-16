# S22 Mobile Job Radar Agent - Task List

## Current Status

- [x] Setup Termux on Samsung S22
- [x] Install Node.js, npm, git, python, sqlite, curl, jq
- [x] Create Node.js project
- [x] Install dotenv and cheerio
- [x] Scan URL and extract title, description, headings, links
- [x] Save last scan as JSON report
- [x] Save scan result into SQLite database
- [x] Add CLI commands: scan, list, show, delete, report, help
- [x] Add markdown report generator
- [x] Add local rule-based classifier
- [x] Add category field
- [x] Add relevance score
- [x] Add classifier notes
- [x] Add README.md basic documentation
- [x] Setup Git local checkpoints

## Phase 1 - CLI Foundation

- [x] `node src/index.js scan <url>`
- [x] `node src/index.js list`
- [x] `node src/index.js show <id>`
- [x] `node src/index.js delete <id>`
- [x] `node src/index.js report <id>`
- [x] `node src/index.js help`
- [ ] Add better error message for 403/blocked websites

## Phase 2 - Local Intelligence and Reports

- [x] Generate markdown report from scan result
- [x] Save report into `reports/`
- [x] Add simple relevance score
- [x] Add category field: job, company, ai_tool, industrial, unknown
- [x] Save classifier notes into SQLite
- [ ] Improve category scoring rules
- [ ] Add page summary field later

## Phase 3 - HTTP API Server

- [ ] Install Express
- [ ] Create `src/server.js`
- [ ] Add `GET /health`
- [ ] Add `GET /pages`
- [ ] Add `GET /pages/:id`
- [ ] Add `POST /scan`
- [ ] Add `GET /report/:id`
- [ ] Test API from S22 using localhost
- [ ] Test API from PC using S22 IP

## Phase 4 - Reusable Tool Functions

- [ ] Move scan logic from `src/index.js` into reusable module
- [ ] Create reusable function: `scanUrl`
- [ ] Create reusable function: `listPages`
- [ ] Create reusable function: `showPage`
- [ ] Create reusable function: `deletePage`
- [ ] Create reusable function: `generateReport`
- [ ] Make CLI and API use the same functions

## Phase 5 - MCP Layer

- [ ] Create MCP server
- [ ] Expose tool: `scan_url`
- [ ] Expose tool: `list_pages`
- [ ] Expose tool: `show_page`
- [ ] Expose tool: `delete_page`
- [ ] Expose tool: `generate_report`
- [ ] Test with MCP-compatible client

## Phase 6 - Playwright Browser Automation

- [ ] Add Playwright experiment
- [ ] Add dynamic page scan command
- [ ] Compare Cheerio static scan vs Playwright dynamic scan
- [ ] Document limitations on Samsung S22

## Phase 7 - ChatGPT Integration Decision

- [ ] Decide integration path: MCP app, GPT Action, or local MCP client
- [ ] Decide tunnel/public endpoint option
- [ ] Document why local IP alone cannot be called by ChatGPT cloud

## Phase 8 - Portfolio Polish

- [ ] Add project architecture diagram
- [ ] Add screenshots from Termux
- [ ] Add limitations section
- [ ] Add GitHub repository
- [ ] Add portfolio/resume bullet
