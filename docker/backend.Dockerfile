FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
COPY db ./db
COPY public ./public

ARG APP_NAME
ENV APP_NAME=$APP_NAME

RUN npm ci --ignore-scripts
RUN npm run prisma:generate
RUN npx nx build $APP_NAME

CMD sh -c "node dist/apps/$APP_NAME/main.js"

