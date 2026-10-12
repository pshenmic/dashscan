FROM node:24-alpine AS build
WORKDIR /app

# vite.config.ts inlines these via `define`, so they are baked in at build time
# and cannot be changed by the runtime environment.
ARG DASHSCAN_API_URL
ARG NETWORK
ENV DASHSCAN_API_URL=$DASHSCAN_API_URL
ENV NETWORK=$NETWORK

COPY yarn.lock /app/yarn.lock
COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json
COPY vite.config.ts /app/vite.config.ts
COPY src /app/src
COPY public /app/public

RUN yarn
RUN yarn build

FROM node:24-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# The nitro node-server output is fully bundled, so no node_modules is needed.
COPY --from=build /app/.output /app/.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]