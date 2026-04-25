# 1. Use the hardened Node.js image from Chainguard
FROM cgr.dev/chainguard/node:latest

WORKDIR /app

# 2. Copy dependency files from root
COPY --chown=node:node package*.json ./

# 3. Install ALL dependencies to be safe for the hackathon
RUN npm install

# 4. Copy the supervisor logic and .env
COPY --chown=node:node supervisor/supervisor-core.js ./supervisor-core.js
COPY --chown=node:node .env .env

# 5. Run the supervisor
ENTRYPOINT ["node", "supervisor-core.js"]