# This image contains node and npm
FROM node:16
WORKDIR /usr/src/app
# RUN apt-get update && apt-get -y install cmake protobuf-compiler
RUN apt-get update && apt-get install -y
RUN apt-get install -y python3 python3-pip
RUN apt-get install -y python3-venv
RUN apt-get install -y graphviz

# Not sure this does anything.
# RUN pip3 install --upgrade pip

# Installing venv like this cause the venv creation to fail.
# RUN pip3 install virtualenv

# The following pip things may have to be called for each venv, not in the container itself.
# Attempts to fix "Failed building wheel for <X>" errors:
RUN pip3 install setuptools-scm && pip3 install --upgrade setuptools
RUN pip3 install -U pip wheel setuptools
# RUN pip3 install wheel
# RUN python -m pip install -U pip wheel setuptools

# To fix the error "Cache entry deserialization failed, entry ignored"
RUN rm -rf ~/.cache/pip


# RUN python3 -m pip3 install --user --upgrade pip3
# RUN apt-get install -y python3-pip
# RUN apt-get install -y python3-venv


# RUN apt-get update && apt-get install -y \
#     && apt install python3 -y \
#     && apt install python3-pip -y \
#     && apt install python3-venv -y

# Create app directory in the image

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