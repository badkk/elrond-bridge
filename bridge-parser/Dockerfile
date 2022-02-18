FROM node:current-alpine3.14

WORKDIR /usr/src/elrond-bridge-parser

# Move source files to docker image
COPY . .

# Install dependencies
RUN yarn && yarn build

# Run
ENTRYPOINT yarn start