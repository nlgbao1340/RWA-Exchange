FROM node:20-alpine

WORKDIR /app

# Install netcat for wait-for-it logic if needed, though we might use sleep
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8545

CMD ["npx", "hardhat", "node"]

