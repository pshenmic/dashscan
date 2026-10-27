FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11.19.0 && npm ci

COPY tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public

ARG DASHSCAN_API_URL
ARG NETWORK=testnet
ENV DASHSCAN_API_URL=$DASHSCAN_API_URL
ENV NETWORK=$NETWORK

RUN npm run build

FROM node:24-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
