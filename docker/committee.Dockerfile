FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/committee/package*.json ./
COPY apps/committee/tsconfig.json .
COPY apps/committee/scripts ./scripts

RUN npm ci

COPY apps/committee/src ./src

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT_BASE=4000
ENV COMMITTEE_INSTANCES=1
ENV MAX_COMMITTEE_INSTANCES=5

RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY apps/committee/package*.json ./

RUN <<'EOF'
cat <<'SCRIPT' > /usr/local/bin/start-committees.sh
#!/bin/sh
set -e

INSTANCES=${COMMITTEE_INSTANCES:-1}
BASE_PORT=${PORT_BASE:-4000}
MAX=${MAX_COMMITTEE_INSTANCES:-5}

if [ "$INSTANCES" -lt 1 ]; then
  echo "COMMITTEE_INSTANCES must be at least 1" >&2
  exit 1
fi

if [ "$INSTANCES" -gt "$MAX" ]; then
  echo "COMMITTEE_INSTANCES ($INSTANCES) cannot exceed $MAX" >&2
  exit 1
fi

pids=""

start_instance() {
  idx=$1
  PORT=$((BASE_PORT + idx))
  echo "Starting committee instance $((idx + 1)) on port $PORT"
  PORT=$PORT node dist/main.js &
  pids="$pids $!"
}

cleanup() {
  if [ -n "$pids" ]; then
    echo "Stopping committee instances..."
    kill $pids 2>/dev/null || true
  fi
  wait
}

trap cleanup INT TERM

i=0
while [ "$i" -lt "$INSTANCES" ]; do
  start_instance "$i"
  i=$((i + 1))
done

wait
SCRIPT
EOF

RUN chmod +x /usr/local/bin/start-committees.sh

EXPOSE 4000 4001 4002 4003 4004

ENTRYPOINT ["dumb-init", "--"]
CMD ["start-committees.sh"]
