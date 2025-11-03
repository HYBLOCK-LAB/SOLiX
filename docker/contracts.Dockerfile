FROM node:20-alpine

WORKDIR /workspace

RUN apk add --no-cache python3 make g++ && \
    npm install --global npm@latest

COPY apps/contracts/package.json ./package.json
COPY apps/contracts/package-lock.json ./package-lock.json

RUN npm install

COPY apps/contracts .

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
