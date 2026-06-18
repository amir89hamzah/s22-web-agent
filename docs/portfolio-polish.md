# GitHub / Portfolio Polish Plan

## Project Positioning

S22 Web Agent is a mobile-first AI automation and MCP portfolio project built on a Samsung S22 using Termux.

The project demonstrates:
- CLI automation
- HTTP API design
- MCP server integration
- Playwright browser inspection through Debian proot
- SQLite persistence
- URL normalization
- Portfolio-ready AI workflow design

## Demo Flow

High-level flow:

ChatGPT or MCP Inspector
-> MCP Server on S22
-> HTTP API Server on port 3001
-> Scanner and SQLite database
-> Optional Playwright Worker on port 3002

## GitHub README Improvements

Add these sections to README:

1. Project overview
2. Why this project exists
3. Architecture
4. Features
5. Tech stack
6. CLI usage
7. HTTP API usage
8. MCP tools
9. Playwright worker setup
10. Demo screenshots
11. Roadmap
12. Portfolio notes

## Screenshots To Capture Later

Recommended screenshots:
- Termux running API server
- MCP Inspector connected to S22 MCP server
- Successful `job_radar_scan`
- Successful `browser_inspect_url`
- CLI scan result
- Generated markdown report
- Git log showing project milestones

## Portfolio Message

This project is designed to show practical AI automation engineering skills using limited hardware.

It connects mobile Linux, Node.js, HTTP APIs, MCP tools, browser automation, and structured reporting into one working end-to-end system.

## Next Polish Tasks

- Update README with public-facing explanation
- Add architecture diagram
- Add `.env.example`
- Add LICENSE
- Add sample output files
- Add screenshots folder
- Add GitHub repo description
