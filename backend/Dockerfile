FROM node:20-slim

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
COPY prisma ./prisma

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN npm ci

RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts

EXPOSE 8000

CMD ["/app/scripts/start.sh"]
