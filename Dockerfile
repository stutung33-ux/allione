FROM node:20-alpine

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Let Railway assign PORT; app reads process.env.PORT
ENV NODE_ENV=production

# Disable baked-in Docker HEALTHCHECK — Railway probes via healthcheckPath
HEALTHCHECK NONE

CMD ["node", "src/app.js"]
