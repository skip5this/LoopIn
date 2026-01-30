#!/bin/bash
# Minimal check for browser-bridge pending tasks
# Outputs a short notification only if tasks exist

response=$(curl -s --connect-timeout 1 http://localhost:3456/health 2>/dev/null)

if [ -z "$response" ]; then
  exit 0  # Server not running, stay silent
fi

pending=$(echo "$response" | grep -o '"pendingTasks":[0-9]*' | cut -d':' -f2)

if [ -n "$pending" ] && [ "$pending" -gt 0 ]; then
  echo "[browser-bridge] $pending pending task(s) from browser"
fi
