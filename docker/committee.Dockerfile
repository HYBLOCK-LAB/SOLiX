FROM node:20-alpine AS builder

WORKDIR /app


COPY apps/committee/package.json .
COPY apps/committee/tsconfig.json .

RUN npm install

COPY apps/committee/src ./src

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY apps/committee/package.json .

EXPOSE 4000

CMD ["node", "dist/main.js"]
