FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
COPY public ./public

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
