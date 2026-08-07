# ===== 构建阶段 =====
FROM node:22-alpine AS builder
WORKDIR /app

# 限制 Node.js 内存（1GB 服务器只能用 512MB）
ENV NODE_OPTIONS="--max-old-space-size=512"

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline 2>&1

COPY . .
ENV NEXT_PUBLIC_API_BASE=""
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== 运行阶段 =====
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE=""
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=256"

# standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]