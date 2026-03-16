#!/bin/bash
# Daily scrape script — run by launchd at 3 AM
# Runs all brand scrapers to populate firstSeenAt for new drops

export PATH="/Users/jason/.nvm/versions/node/v20.20.0/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/scrape-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

echo "=== Scrape started at $(date) ===" >> "$LOG_FILE"
cd "$SCRIPT_DIR" && npm run scrape >> "$LOG_FILE" 2>&1
echo "=== Scrape finished at $(date) ===" >> "$LOG_FILE"

# Keep only last 14 days of logs
find "$LOG_DIR" -name "scrape-*.log" -mtime +14 -delete
