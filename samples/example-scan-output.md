# Sample Scan Output

Example command:

    node src/index.js scan example.com

Expected normalized URL:

    https://example.com/

Example result summary:

    Title: Example Domain
    Category: unknown
    Relevance Score: 15
    Output Path: reports/last-scan.json
    Database: data/radar.db

Example follow-up commands:

    node src/index.js list
    node src/index.js show 1
    node src/index.js report 1

Notes:

- `example.com` is used because it is a safe public test domain.
- Actual scan IDs may differ depending on the local SQLite database.
- Generated reports are stored locally and may be ignored from Git.
