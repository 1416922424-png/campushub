FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY h5/ /app/h5/
EXPOSE 3000
ENV PORT=3000
CMD ["node", "src/app.js"]
