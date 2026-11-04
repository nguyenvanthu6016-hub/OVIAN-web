# OVIAN storefront — production image (Next.js standalone output)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S ovian && adduser -S ovian -G ovian && mkdir -p /app/.data && chown ovian:ovian /app/.data
COPY --from=build --chown=ovian:ovian /app/.next/standalone ./
COPY --from=build --chown=ovian:ovian /app/.next/static ./.next/static
COPY --from=build --chown=ovian:ovian /app/public ./public
USER ovian
# Idempotency store lives here — mount a volume so it survives restarts.
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
