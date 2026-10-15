#!/usr/bin/env bash
# HelpDesk Pro — HPA Load Test & Metrics Generator
set -euo pipefail

TARGET_URL="${URL:-http://localhost:8000/api/tickets}"
REQUESTS="${REQUESTS:-1000}"
CONCURRENCY="${CONCURRENCY:-10}"

echo "=========================================================="
echo " Starting HelpDesk Pro Load Test"
echo " Target URL  : ${TARGET_URL}"
echo " Requests    : ${REQUESTS}"
echo " Concurrency : ${CONCURRENCY}"
echo "=========================================================="

if command -v ab >/dev/null 2>&1; then
    echo "Running ApacheBench load generator..."
    ab -n "$REQUESTS" -c "$CONCURRENCY" "$TARGET_URL"
else
    echo "Running curl in parallel loops..."
    for i in $(seq 1 "$REQUESTS"); do
        curl -s "$TARGET_URL" >/dev/null &
        if (( i % CONCURRENCY == 0 )); then
            wait
        fi
    done
    wait
fi

echo "=========================================================="
echo " Load test completed! Check Grafana dashboard & HPA status:"
echo " kubectl get hpa -n helpdesk"
echo "=========================================================="
