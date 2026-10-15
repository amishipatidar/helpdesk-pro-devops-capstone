# Stage 1: Build React static assets
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Nginx non-root runtime
FROM nginx:1.27-alpine

# Move PID file to /tmp so non-root user can write it
RUN sed -i 's|/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf && \
    chown -R 101:101 /usr/share/nginx/html && \
    chown -R 101:101 /var/cache/nginx && \
    chown -R 101:101 /var/log/nginx && \
    chown -R 101:101 /etc/nginx/conf.d

COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf

USER 101
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
