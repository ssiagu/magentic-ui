docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t youtube-api:latest \
    .
