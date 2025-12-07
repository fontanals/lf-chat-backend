# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Development stage
FROM node:22-alpine AS development

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev"]
