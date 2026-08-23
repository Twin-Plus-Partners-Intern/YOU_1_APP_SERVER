# Dockerfile — YOU_1_APP_SERVER
# Đặt file này tại thư mục gốc repo YOU_1_APP_SERVER, tên: Dockerfile

# ---- Base: dùng Alpine để image nhỏ, tăng tốc pull/deploy trên EC2 t3.small ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Deps: cài production dependencies riêng để tận dụng layer cache ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime image ----
FROM base AS runtime
ENV NODE_ENV=production

# Không chạy bằng root — giảm rủi ro nếu container bị chiếm quyền
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY .sequelizerc ./

USER nodejs

EXPOSE 3000

# Healthcheck khớp route /health đã có sẵn trong src/app.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# server.js đọc PORT qua src/config/env.js (mặc định 3000, override bằng env PORT)
CMD ["node", "src/server.js"]
