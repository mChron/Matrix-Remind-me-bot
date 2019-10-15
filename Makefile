CURRENT_MAKEFILE := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
MAKEFILE_DIRECTORY := $(dir $(CURRENT_MAKEFILE))
REMOTE := origin
BASE_VERSION := "latest"

#REGISTRY := self-hosted:12345
#DOCKER_TAG_BASE := ${REGISTRY}/personal/
DOCKER_TAG_BASE := ""

TZ := America/New_York

.PHONY: all
all: docker

docker: Dockerfile
	$(eval VERSION := $(shell git describe --tags || echo "1.0"))
	$(eval BRANCH := $(shell git rev-parse --abbrev-ref HEAD))
	$(eval REPO := $(shell git config --local remote.$(REMOTE).url|sed -E "s/(http[s]?:\/\/|ssh:\/\/git)(.+:.+)@/\1/g"))
	$(eval PROJECT := $(shell git config --local remote.$(REMOTE).url|sed -n 's#.*/\([^.]*\)\.git#\1#p'))
	$(eval IMAGE_TAG := $(DOCKER_TAG_BASE)$(PROJECT):$(VERSION))
	$(eval LATEST_TAG := $(DOCKER_TAG_BASE)$(PROJECT):latest)
	$(eval GIT_SHA := $(shell git rev-parse --verify HEAD))
	$(eval GIT_AUTHOR := $(shell git show -s --format='%an' $(GIT_SHA)))
	docker build --no-cache \
	--build-arg REGISTRY=$(REGISTRY) \
	--build-arg VERSION=$(BASE_VERSION) \
	--build-arg BUILD_DATE_TIME="$(shell date "+%Y-%m-%d %I:%M:%S%z")" \
	--build-arg REPO="$(REPO)" \
	--build-arg REPO_BRANCH="$(BRANCH)" \
	--build-arg GIT_SHA="$(GIT_SHA)" \
	--build-arg GIT_AUTHOR="$(GIT_AUTHOR)" \
	--build-arg IMAGE_TAG="$(IMAGE_TAG)" \
	--build-arg TZ=$(TZ) \
	-t $(IMAGE_TAG) -t $(DOCKER_TAG_BASE)$(PROJECT):latest .

docker-deploy: docker
	docker push $(IMAGE_TAG)
	docker push $(LATEST_TAG)

docker-deploy-clean: docker-deploy
	docker rmi $(IMAGE_TAG)
	docker rmi $(LATEST_TAG)