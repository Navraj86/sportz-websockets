# Production image for the Express + WebSocket backend.
# Runs as a long-lived process, which WebSockets need (serverless functions can't hold them).
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first so this layer is cached between code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.js ./

USER node
EXPOSE 8000
CMD ["node", "src/index.js"]
