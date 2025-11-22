FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source after build
RUN rm -rf src node_modules && \
    npm ci --only=production

ENTRYPOINT ["node", "dist/index.js"]
