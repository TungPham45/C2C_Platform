FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs

ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm ci --ignore-scripts
RUN npx vite build --config apps/web/vite.config.mts

CMD ["npx", "vite", "preview", "--config", "apps/web/vite.config.mts", "--host", "0.0.0.0", "--port", "4200"]

