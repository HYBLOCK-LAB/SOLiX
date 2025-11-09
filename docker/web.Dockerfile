FROM node:20-bullseye-slim AS deps

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY apps/web/package.json ./
COPY apps/web/package-lock.json ./

RUN npm install

FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
COPY apps/web/.env ./.env.build

RUN if [ -f ./.env.build ]; then cp ./.env.build ./.env; fi

RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY apps/web/package.json ./package.json

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
