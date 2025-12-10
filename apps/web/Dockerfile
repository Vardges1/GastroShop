# ---------- Зависимости ----------
    FROM node:20-alpine AS deps
    WORKDIR /app
    RUN apk add --no-cache libc6-compat
    COPY package.json package-lock.json* ./
    # Если есть lock — используем ci, иначе обычный install
    RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
    
    # ---------- Запуск ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=development
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # Копируем все исходные файлы и зависимости
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    EXPOSE 3000
    CMD ["npm", "run", "dev"]
    