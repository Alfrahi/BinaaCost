FROM node:20-alpine AS frontend-builder
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm vite build

FROM alpine:3.19
ARG PB_VERSION=0.40.1
RUN apk add --no-cache unzip ca-certificates curl sqlite
# Download Pocketbase
RUN curl -L -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip /tmp/pb.zip -d /usr/local/bin/ \
    && rm /tmp/pb.zip \
    && chmod +x /usr/local/bin/pocketbase

WORKDIR /app
COPY ./pocketbase/pb_migrations ./pb_migrations
COPY ./pocketbase/pb_hooks ./pb_hooks
COPY --from=frontend-builder /app/dist ./pb_public

EXPOSE 8090
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]
