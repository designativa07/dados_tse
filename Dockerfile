FROM node:18-alpine

WORKDIR /app

COPY package.json ./

# Install dependencies
# Using npm ci if package-lock.json exists, otherwise npm install
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set Node.js memory limit to 8GB
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Start command
CMD ["npm", "start"]
