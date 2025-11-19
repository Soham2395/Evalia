FROM golang:1.25-alpine AS builder

WORKDIR /app

# Allow the container to auto-resolve exact toolchain versions when needed
ENV GOTOOLCHAIN=auto

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o voice-service .

# Runtime image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/voice-service .

EXPOSE 8080

CMD ["./voice-service"]
