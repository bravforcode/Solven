FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time mode: "demo" (default) bypasses Clerk/Stripe entirely so the
# compose demo runs keyless; production builds pass NEXT_PUBLIC_SOLVEN_MODE=
# (unset) plus real Clerk/Stripe keys.
ARG NEXT_PUBLIC_SOLVEN_MODE=demo
ENV NEXT_PUBLIC_SOLVEN_MODE=$NEXT_PUBLIC_SOLVEN_MODE
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
