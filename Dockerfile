FROM node:18-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm install typescript

RUN npm run build

CMD ["node", "dist/src/bot.js"]