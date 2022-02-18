#!/bin/bash
# DO NOT PUSH TO DOCKER HUB
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')
IMAGEID="elrond-bridge-transfer:$PACKAGE_VERSION"
echo "Building elrond-bridge-transfer:$PACKAGE_VERSION ..."
docker build -t $IMAGEID .