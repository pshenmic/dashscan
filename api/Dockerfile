FROM node:24-alpine AS build
WORKDIR /app
COPY yarn.lock /app/yarn.lock
COPY package.json /app/package.json
COPY index.ts /app/index.ts
COPY tsconfig.json /app/tsconfig.json
COPY src /app/src

# RUN apk add git
RUN yarn
RUN yarn build

FROM node:20-alpine AS api
WORKDIR /app
COPY --from=build /app/dist /app
CMD ["node", "index.js"]
