# mborne/crash-test

A buggy application to illustrate Docker and Kubernetes features (mainly auto-restart and limits) :

![docs/screenshot.png](docs/screenshot.png?t=20260315)

## Parameters

| Name          | Description                                                                                                                             | Default    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `DEBUG_PORT`  | Listening port                                                                                                                          | `3000`     |
| `DEBUG_COLOR` | A color to illustrates env vars handling and blue/green deployments                                                                     | `null`     |
| `LOG_FORMAT`  | Log format to illustrate JSON parsing ("simple" or "json")                                                                              | `"simple"` |
| `LOG_LEVEL`   | [Log level](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels) ("debug", "verbose", "info", "warn", "error") | `"info"`   |

## Usage

### Usage with docker

See [compose.yml](compose.yml) :

```bash
# start on http://localhost:3000
docker compose up -d --build

# simulate crash 
curl -X POST http://localhost:3000/api/bug/crash

# simulate memory leak
while true; do curl -X POST -sS http://localhost:3000/api/bug/memory-leak ; echo; sleep 1; done
```

### Kubernetes usage

In one terminal :

```bash
# deploy
kubectl -k manifests
# To watch pods restarts :
watch kubectl get pods -o wide
# To watch pods CPU / RAM :
watch kubectl top pods
```

In another terminal :

```bash
# create temp pod
kubectl run terminal  --rm -it  --image=ghcr.io/mborne/terminal:latest --restart=Never -- /bin/sh

# get metadata
curl -sS http://debug/api/metadata | jq

# crash random pod
curl -X POST -sS http://debug/api/bug/crash | jq
# simulate memory leak
while true; do curl -X POST -sS http://debug/api/bug/memory-leak | jq ; sleep 5; done
```

### Local usage

```bash
# install stress-ng
sudo apt-get update
sudo apt-get install -y stress-ng

# install dependencies
npm install
# start on http://localhost:3000
npm run start
```

## License

[MIT](LICENSE)
