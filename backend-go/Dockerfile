# --- build ---
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/core ./cmd/server

# --- runtime ---
FROM gcr.io/distroless/static-debian12
COPY --from=build /out/core /core
EXPOSE 8080
ENTRYPOINT ["/core"]
