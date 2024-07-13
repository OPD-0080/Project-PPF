FROM node:lts-alpine
ENV NODE_ENV=development
WORKDIR /projects/ppf/app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3030
USER projectppf
CMD nodemon -e ejs,js,scss
VOLUME .:/data/db