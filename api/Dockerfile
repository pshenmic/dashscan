FROM node:24-alpine AS build
WORKDIR /app
COPY yarn.lock /app/yarn.lock
COPY package.json /app/package.json
COPY index.ts /app/index.ts
COPY tsconfig.json /app/tsconfig.json
COPY src /app/src
COPY scripts /app/scripts

# RUN apk add git
RUN yarn
RUN yarn build
RUN yarn geoip

FROM node:20-alpine AS api
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app
COPY --from=build /app/geoip /app/geoip
CMD ["node", "index.js"]
