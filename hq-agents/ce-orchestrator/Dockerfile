# HQ KRAEFEGG M.O. - Orquestrador da Equipe (Code Engine job)
FROM node:20-alpine AS base
RUN apk add --no-cache rclone ca-certificates tzdata && \
    adduser -D -u 1001 hq
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    chown -R 1001:1001 /app
COPY index.mjs ./
USER 1001
ENV RCLONE_CONF=/app/rclone/rclone.conf
CMD ["node", "index.mjs"]
