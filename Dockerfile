FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

RUN chmod -R 755 /usr/src/app && \
    chmod +x ./node_modules/.bin/ts-node && \
    chmod +x ./node_modules/.bin/tsc

CMD ["npm", "start"]