# Use the official Node.js 20 lightweight image as the base
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install all dependencies (including devDependencies) for the build
RUN npm ci

# Copy the rest of the application files
COPY . .

# Run the production build (Vite + esbuild for server)
RUN npm run build

# Use a clean, production-only stage to minimize container size
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the build outputs from the builder stage
COPY --from=builder /app/dist ./dist

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port 8080 (which is the default port for Cloud Run)
EXPOSE 8080

# Start the application using our bundled Express server
CMD ["node", "dist/server.cjs"]
