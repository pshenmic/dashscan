FROM rust
WORKDIR /app
COPY Cargo.lock .
COPY Cargo.toml .
COPY src /app/src
COPY migrations /app/migrations
RUN cargo build --release
RUN cp target/release/indexer .
ENTRYPOINT ["/app/indexer"]
