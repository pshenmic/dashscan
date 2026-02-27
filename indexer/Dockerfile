FROM rust:1.92.0-alpine3.20 AS build

RUN apk add --no-cache git cmake clang openssl openssl-dev openssl-libs-static build-base

WORKDIR /app
COPY Cargo.lock .
COPY Cargo.toml .
COPY src /app/src
COPY migrations /app/migrations
RUN cargo build --release

FROM alpine:3.20 AS indexer
WORKDIR /app
COPY --from=build /app/target/release/indexer /app
ENTRYPOINT ["/app/indexer"]
