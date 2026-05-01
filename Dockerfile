FROM node:20-slim

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/src ./src

EXPOSE 3001

CMD ["sh", "-c", "node src/database/seed.js && node src/app.js"]
