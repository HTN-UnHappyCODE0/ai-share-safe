# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install ca-certificates and tzdata for HTTPS requests and timezone handling
RUN apk update && apk add --no-cache ca-certificates tzdata git

# Cache dependencies
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server cmd/server/main.go

# Production Stage
FROM alpine:3.19

WORKDIR /app

RUN apk update && apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/server /app/server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Expose port
EXPOSE 8080

# Environment defaults
ENV PORT=8080
ENV ENV=production
ENV DATABASE_TYPE=sqlite
ENV DATABASE_URL=/app/data/aisharesafe.db

VOLUME [ "/app/data" ]

ENTRYPOINT ["/app/server"]
