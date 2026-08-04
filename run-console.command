#!/bin/bash
# Double-click this file to run the AI agent console on this computer only.
# Nothing is exposed to the internet.
cd "$(dirname "$0")"
echo ""
echo "  Southern Comprehensive Insurance — Agent Console"
echo "  ------------------------------------------------"
echo "  Opening http://localhost:8000/admin/"
echo ""
echo "  Leave this window open while you work."
echo "  Close it (or press Control-C) when you're done."
echo ""
sleep 1
open "http://localhost:8000/admin/" 2>/dev/null || true
python3 -m http.server 8000
