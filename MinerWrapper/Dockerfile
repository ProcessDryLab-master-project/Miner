# This image contains node and npm
FROM node:16

# Create app directory in the image
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
# Get package.json and package.lock and Install app dependencies
COPY package*.json ./
RUN npm install

# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

#Expose port 8080 on the virtual machine
EXPOSE 5000

CMD ["node", "Index.js"]