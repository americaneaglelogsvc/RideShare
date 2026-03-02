# Multi-stage Dockerfile for NestJS gateway service

# 1) Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and tsconfig
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Build Nest app into dist/
RUN npm run build

# 2) Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy only what we need to run
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Cloud Run will inject PORT; default to 8080 as backup
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main.js"]
