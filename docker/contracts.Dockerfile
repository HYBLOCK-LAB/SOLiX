FROM node:22-alpine

WORKDIR /workspace

RUN apk add --no-cache python3 make g++ && \
    npm install --global npm@latest

COPY apps/on-chain/package.json ./package.json
COPY apps/on-chain/package-lock.json ./package-lock.json

RUN npm install

COPY apps/on-chain .

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
