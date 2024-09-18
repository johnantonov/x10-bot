FROM node:18-alpine
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x ./node_modules/.bin/tsc
RUN npm run build

CMD ["node", "dist/src/bot.js"]