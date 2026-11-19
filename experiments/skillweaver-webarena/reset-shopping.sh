#!/usr/bin/env bash
# Reset WebArena Shopping (OneStopShop) to its image: remove the container, start a fresh one from
# shopping_final_0712, and set the store's base URL (WebArena's environment_docker/README.md).
# Usage: bash reset-shopping.sh [http://localhost:7770]
set -euo pipefail
HOST_URL="${1:-http://localhost:7770}"
HOST_URL="${HOST_URL%/}"
PORT="${HOST_URL##*:}"
IMAGE=shopping_final_0712
docker image inspect "$IMAGE" >/dev/null 2>&1 || { echo "image $IMAGE not loaded: docker load --input shopping_final_0712.tar" >&2; exit 2; }
docker rm -f shopping >/dev/null 2>&1 || true
docker run --name shopping -p "127.0.0.1:$PORT:80" -d "$IMAGE" >/dev/null
echo "waiting for MySQL in the container..."
for _ in $(seq 1 90); do
  docker exec shopping mysql -u magentouser -pMyPassword magentodb -e 'select 1' >/dev/null 2>&1 && break
  sleep 5
done
docker exec shopping /var/www/magento2/bin/magento setup:store-config:set --base-url="$HOST_URL"
docker exec shopping mysql -u magentouser -pMyPassword magentodb -e "UPDATE core_config_data SET value='$HOST_URL/' WHERE path = 'web/secure/base_url';"
docker exec shopping /var/www/magento2/bin/magento cache:flush
status=
for _ in $(seq 1 90); do
  status="$(curl --noproxy '*' -s --max-time 10 -o /dev/null -w '%{http_code}' "$HOST_URL/" || true)"
  [ "$status" = 200 ] && break
  sleep 5
done
if [ "$status" != 200 ]; then
  echo "shopping did not become ready at $HOST_URL (HTTP ${status:-none})" >&2
  exit 3
fi
echo "reset done $(date -u +%Y-%m-%dT%H:%M:%SZ) image $(docker image inspect "$IMAGE" --format '{{.Id}}') url $HOST_URL"
