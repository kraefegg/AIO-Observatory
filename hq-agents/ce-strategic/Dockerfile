# CEO KRAEFEGG M.O. - Backend Estrategico (Code Engine app)
FROM node:20-alpine
RUN apk add --no-cache rclone
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY index.mjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.mjs"]
