# S22 Mobile Job Radar Agent

A mobile-first web automation and information extraction prototype running on Samsung S22 using Termux, Node.js, SQLite, and Git.

This project explores whether an Android phone can act as a lightweight AI automation development environment and local automation node.

## Current Features

- Scan a webpage URL
- Extract page title, description, headings, and links
- Save scan result into SQLite
- List saved scan records
- Show full scan detail by ID
- Delete unwanted scan records
- Generate markdown report from saved scan data
- Track development progress using Git

## Why Samsung S22?

This project is intentionally built on Samsung S22 through Termux.

Instead of using a VPS or laptop as the main runtime, the phone acts as the local development and execution environment.

## Tech Stack

- Samsung S22
- Termux
- Node.js
- npm
- Cheerio
- SQLite
- Git

## Commands

Install dependencies:

    npm install

Scan a webpage:

    node src/index.js scan https://example.com

List saved scans:

    node src/index.js list

Show scan detail:

    node src/index.js show 1

Delete scan record:

    node src/index.js delete 1

Generate markdown report:

    node src/index.js report 1

Show help:

    node src/index.js help

## Example Flow

    node src/index.js scan https://example.com
    node src/index.js list
    node src/index.js show 1
    node src/index.js report 1

## Project Direction

This project is planned to evolve into a mobile-hosted AI automation agent with:

- CLI workflow
- SQLite-backed memory
- Markdown report generation
- AI summarization
- MCP tool layer
- Optional Flowise or n8n integration

## Limitations

- Some websites may block simple HTTP requests with 403 Forbidden.
- This prototype currently extracts static HTML content only.
- JavaScript-heavy websites may require Playwright or browser automation later.
- The project is built for learning and portfolio demonstration, not production use.

## Portfolio Summary

Built a Samsung S22-hosted web automation prototype using Termux, Node.js, SQLite, and Git. The system scans web pages, extracts structured page data, stores results locally, and generates markdown reports, demonstrating mobile-first AI automation workflow development without relying on VPS infrastructure.
