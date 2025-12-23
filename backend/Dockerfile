FROM node:20-alpine
WORKDIR /app

COPY package*.json ./

# Install deps from package-lock if it exists
RUN npm install
RUN npm ci

COPY . .

CMD ["sh", "-c", "npx hardhat compile && npx hardhat run scripts/deploy.js --network sepolia"]