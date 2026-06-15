# S22 Mobile Job Radar Agent - Task List

## Current Status

- [x] Setup Termux on Samsung S22
- [x] Install Node.js, npm, git, python, sqlite, curl, jq
- [x] Create Node.js project
- [x] Install dotenv and cheerio
- [x] Scan URL and extract title, description, headings, links
- [x] Save last scan as JSON report
- [x] Save scan result into SQLite database
- [x] Add `scan` command
- [x] Add `list` command
- [x] Setup Git local checkpoint

## Phase 1 - CLI Foundation

- [x] `node src/index.js scan <url>`
- [x] `node src/index.js list`
- [ ] Add `show <id>` command to view full scan detail
- [ ] Add `delete <id>` command to remove wrong/duplicate scan
- [ ] Add better error message for 403/blocked websites
- [ ] Add README.md basic documentation

## Phase 2 - Report Generator

- [ ] Generate markdown report from scan result
- [ ] Save report into `reports/`
- [ ] Add `report <id>` command
- [ ] Add simple relevance score
- [ ] Add category field: job, company, AI tool, industrial, unknown

## Phase 3 - AI Layer

- [ ] Add `.env.example`
- [ ] Add OpenAI API call or local mock classifier
- [ ] Summarize page content
- [ ] Classify page relevance
- [ ] Save AI summary into SQLite

## Phase 4 - MCP Layer

- [ ] Create MCP server
- [ ] Expose tool: `scan_url`
- [ ] Expose tool: `list_pages`
- [ ] Expose tool: `show_page`
- [ ] Expose tool: `generate_report`
- [ ] Test with MCP-compatible client

## Phase 5 - S22 Portfolio Polish

- [ ] Add project architecture diagram
- [ ] Add screenshots from Termux
- [ ] Add limitations section
- [ ] Add GitHub repository
- [ ] Add portfolio/resume bullet
