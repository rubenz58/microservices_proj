FROM node:12-alpine
WORKDIR /app
COPY wait-for ./wait-for
RUN chmod +x wait-for
EXPOSE 8080
