ARG FROM_IMAGE=node
ARG FROM_VERSION=12.11.1
FROM ${FROM_IMAGE}:${FROM_VERSION}

ARG VERSION
ARG BUILD_DATE_TIME
ARG REPO
ARG REPO_BRANCH
ARG IMAGE_TAG
ARG GIT_SHA
ARG GIT_AUTHOR
ARG NODE_VERSION=12.11.1
ARG NPM_VERSION=3.10.10

LABEL org.opencontainers.image.created="${BUILD_DATE_TIME}" \
  org.opencontainers.image.authors="${GIT_AUTHOR}" \
  org.opencontainers.image.url="${REPO}" \
  org.opencontainers.image.documentation="${REPO}" \
  org.opencontainers.image.source="${REPO}" \
  org.opencontainers.image.version="${REPO_BRANCH}" \
  org.opencontainers.image.revision="${GIT_SHA}" \
  org.opencontainers.image.vendor="" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.ref.name="" \
  org.opencontainers.image.title="Matrix Remind Me Bot" \
  org.opencontainers.image.description="Docker image for Remind Me - A matrix chat bot to remind you. Fork of repo by joakimvonanka https://github.com/joakimvonanka/Matrix-Remind-me-bot" \
  org.label-schema.docker.cmd="docker run -d -v $(pwd)/config.json:/app/config.json:ro -v $(pwd)/notif_bot.js/app/notif_bot.json:rw --name mtx-reminder-bot ${IMAGE_TAG}" \
  org.label-schema.docker.cmd.debug="docker exec -it --entrypoint /bin/bash [CONTAINER]" \
  org.label-schema.docker.params="" \
  afrl.cecep.image.component.node.version="${NODE_VERSION}"

COPY ./ /app
WORKDIR /app

# install deps
RUN npm i -g npm@${NPM_VERSION} && npm i && npm i -g typescript && npm run build

ENTRYPOINT ["npm", "start"]
