FROM node:20-alpine AS deps

WORKDIR /app

COPY apps/web/package.json ./
COPY apps/web/package-lock.json ./

RUN npm install

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./app

WORKDIR /app/app

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/app/.next ./.next
COPY --from=builder /app/app/public ./public
COPY apps/web/package.json .

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
